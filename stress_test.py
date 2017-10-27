# -*- coding: utf-8 -*-
"""Stress Test

This module will perform the following stress tests, based on --test flag

RAM - Consumes specified % of RAM, specified by -p for the number of seconds specified in -s
Allocate at least the minimum percentage of ram specified. During testing, it was found to consume within one (1)
percentage point of RAM due to operating system/python overhead. If you are testing a strict 90% threshold, set the test
to use 91%. If that amount of RAM is already consumed, a warning is logged and the process exits. This program DOES NOT
perform dynamic reallocating of RAM; if another process starts allocates or de-allocates memory, this program will NOT
change the amount of RAM it uses.

HDD - Consumes specified % of HDD space on the volume(s) specified by --volumes, for the number of seconds specified in
-s
This test may require sudo access - A file is created at the root of each specified volume, which corresponds to the
percentage of space -p. If sudo access is required the user is prompted

CPU - Consumes 100% of CPU of number of cores specified by -c

Network - Consumes ~100% of network traffic on interface specifeid by --int (e.g. eth0) for the number of seconds
specified in -s


Example:
    The following examples will consume approximately 95% or RAM for 30 seconds.

        $ python stress_test.py --test ram --percent=95 --seconds=30
        $ python stress_test.py -t ram -p 95 -s 30
        $
        $ python stress_test.py --test hdd --percent=90 --seconds=30 --volume=/,/sda1
        $ python stress_test.py -t hdd -p 90 -s 30 -v /,/sda1
        $
        $ python stress_test.py --test net --seconds=30 --hostname=amida.com --interface=eth0
        $ python stress_test.py -t net -s 30 -n www.amida.com -i eth0
        $
        $ python stress_test.py --test cpu --seconds=30 --core_count=2
        $ python stress_test.py -t cpu -s 30 -c 2


TODO:
    * Dynamically re-allocate RAM

"""
import time
import argparse
import locale
import math
import sys
import logging
import subprocess
import random
import threading
import atexit
import tempfile
import os
import platform
# iperf3 is imported inside it's function to minimize impact of OS specific issue with import

# Filename used for hard drive stress test
TEMP_FILE_NAME = "MAGIC_HDD_STRESS_TEST_FILENAME"
pre_reqs_ran = False


def install_and_import(package):
    """
    Essentially calls pip install <package>

    :param package: The name of the package to install
    :return: nothing
    """
    import importlib
    try:
        importlib.import_module(package)
    except ImportError:
        import pip
        pip.main(['install', package])
    finally:
        globals()[package] = importlib.import_module(package)


def sudo_exec(cmdline, passwd):
    osname = platform.system() # 1
    if osname == 'Linux':
        prompt = r'\[sudo\] password for %s: ' % os.environ['USER']
    elif osname == 'Darwin':
        prompt = 'Password:'
    else:
        assert False, osname

    child = pexpect.spawn(cmdline)
    idx = child.expect([prompt, pexpect.EOF], 3) # 2
    if idx == 0: # if prompted for the sudo password
        logger.debug('sudo password was asked.')
        child.sendline(passwd)
        child.expect(pexpect.EOF)
    return child.before


def which(program):
    import os

    def is_exe(fpath):
        return os.path.isfile(fpath) and os.access(fpath, os.X_OK)

    fpath, fname = os.path.split(program)
    if fpath:
        if is_exe(program):
            return program
    else:
        for path in os.environ["PATH"].split(os.pathsep):
            path = path.strip('"')
            exe_file = os.path.join(path, program)
            if is_exe(exe_file):
                return exe_file

    return None


def run_pre_reqs():
    command_string = "sudo yum -y update && sudo yum install -y python-devel && sudo yum install -y epel-release && sudo yum install -y python-pip && sudo yum groupinstall -y development && sudo yum install stress && sudo pip install --upgrade pip"
    print("If you are running CentOS/RHEL, please run the following command first")
    print(command_string)
    #if which("yum"):
    #    sudo_exec(command_string, "")


# All non-standdard python packages go in try-except blocks to auto-install on machines that don't have them.
try:
    import psutil
except ImportError:
    try:
        install_and_import("psutil")
    except:
        run_pre_reqs()
        install_and_import("psutil")

try:
    import pexpect
except ImportError:
    try:
        install_and_import("pexpect")
    except:
        run_pre_reqs()
        install_and_import("pexpect")


# locale.setlocale is used for localization (formatting numbers). The try-except is for the differnce between Windows
# and Linux locale environment definitions
try:
    locale.setlocale(locale.LC_ALL, 'en_us')
except locale.Error:
    locale.setlocale(locale.LC_ALL, '')


def format_bytes(num_bytes):
    """"Helper function to prettify integers.

    Args:
        num_bytes (int): Number to be formatted.
    """
    return locale.format("%d", num_bytes, grouping=True)


def bytes_to_english(num_bytes):
    """Converts integers into standard computer byte names, i.e. a kilobyte is NOT 10^3, a kilobyte is 2^10. This
    function requires a byte size to be ten (10) times a base unit size before it will convert, e.g. a 2,097,152 will
    NOT convert to "2 megabytes" because it is only two (2) times the size of a megabyte, but 11,000,000 will convert
    to 10.49 megabytes, because it is more than ten (10) times greater than 1,048,576 (a megabyte)

    Args:
        num_bytes (int): Number to be formatted.

    Returns:
        string: Prettified string of appropriate byte name, with 3 significant figures (places after the decimal)
    """
    YOTA = 2 ** 80
    ZETA = 2 ** 70
    EXA = 2 ** 60
    PETA = 2 ** 50
    TERA = 2 ** 40
    GIG = 2 ** 30
    MEG = 2 ** 20
    KAY = 2 ** 10
    return_value = str(num_bytes) + " bytes"
    shorthand_names = [[KAY, "kilobytes"], [MEG, "megabytes"], [GIG, "gigabytes"], [TERA, "terabytes"],
                       [PETA, "petabytes"], [EXA, "exabytes"], [ZETA, "zetabytes"], [YOTA, "yottabytes"]]
    for name in shorthand_names:
        if num_bytes > 10 * name[0]:
            value = num_bytes/name[0]
            return_value = "{:.3f}".format(value) + " " + name[1]
    return return_value


def get_ram_stats():
    """Retrieves and logs memory statistics.

    The total memory system memory and available system memory are returned and logged at the 'info' level.

    Returns:
        dict: Dictionary with 2 keys, "Total RAM", and  "Available RAM".
    """
    mem_use = psutil.virtual_memory()
    total_ram, available_ram = mem_use[0:2]
    logger.info("    Total RAM: %s - (%s bytes)" % (bytes_to_english(total_ram), format_bytes(total_ram)))
    logger.info("Available RAM: %s - (%s bytes)" % (bytes_to_english(available_ram), format_bytes(available_ram)))
    logger.info("Available RAM: %s%% - Used RAM: %s%%" % ("{:.2f}".format((float(available_ram)/float(total_ram))*100.0),
                                                          "{:.2f}".format((1-(float(available_ram)/float(total_ram)))*100.0)))
    return {"Total RAM": total_ram, "Available RAM": available_ram}


def get_drive_stats():
    partitions = psutil.disk_partitions()
    logger.info("Drive & Partition Info")
    logger.info("======================")
    logger.info("")

    for partition in partitions:
        output_string1 = "Device: "+partition.device + ", Mount Point: " + partition.mountpoint + ", File System: " + \
                        partition.fstype + ", Options: " + partition.opts
        logger.info(output_string1)
        if partition.fstype:
            disc_info = psutil.disk_usage(partition.mountpoint)
            output_string2 = "Total Size: " + format_bytes(disc_info.total)
            output_string2 += ", Bytes Used: " + format_bytes(disc_info.used) + " (" + str(disc_info.percent) + "%)"
            output_string2 += ", Bytes Free: " + format_bytes(disc_info.free)
            logger.info(output_string2)
    return partitions


def fib(n):
    if n < 2:
        return 1
    else:
        return fib(n - 1) + fib(n - 2)


def cpu_test_worker_thread(cpu_id):
    p = psutil.Process()
    p.cpu_affinity([cpu_id])
    x = 10000000
    while True:
        fib(x)
        print(x)


def consume_mem(byte_count):
    """Creates a string that is byte_count bytes long and returns the value. This is simple, but effective way to
    allocate memory

    Args:
        byte_count (int): The number of bytes of RAM to allocate

    Returns:
        A string that is <byte_count> bytes long
    """
    return ' ' * int(byte_count)


def ram_test(args, parser):
    logger.info("Starting RAM Stress Test")
    logger.info("========================")
    logger.info("")
    percent = args.percent
    seconds = args.seconds
    if seconds <= 0:
        logger.warning("Non-positive running time specified. Exiting.")
        exit(1)
    if percent <= 0:
        logger.warning("Non-positive RAM percentage specified. Exiting.")
        exit(1)
    if not percent or not seconds:
        error_message = "-p and -s must both be specified for RAM testing. See %s --help" % sys.argv[0]
        parser.error(error_message)
        logger.error(error_message)
        exit(1)
    stats = get_ram_stats()
    num_bytes_to_use = math.floor(((percent / 100.0) * stats["Total RAM"]) - (stats["Total RAM"] -
                                                                              stats["Available RAM"]))
    if num_bytes_to_use <= 0:
        logger.warning("System already exceeds %d%% RAM use.\nExiting." % percent)
        exit(1)
    logger.info("Consuming additional %s bytes (%s) of RAM to take total RAM use to > %s%%..." % (
        format_bytes(num_bytes_to_use), bytes_to_english(num_bytes_to_use), "{:.0f}".format(percent)))
    dummy_variable_to_consume_memory = consume_mem(num_bytes_to_use)
    logger.info("RAM allocation complete.")
    logger.info("RAM will be held for %s seconds, then released." % seconds)
    get_ram_stats()
    time.sleep(seconds)
    logger.info("De-allocating RAM.")
    dummy_variable_to_consume_memory = ""
    get_ram_stats()
    logger.info("***** RAM Stress Test Complete.")
    logger.info("")


def is_file_system_is_case_sensitive():
    tmphandle, tmppath = tempfile.mkstemp()
    if os.path.exists(tmppath.upper()):
        return False
    else:
        return True


def remove_temp_files():
    volume_info = get_drive_stats()
    for existing_volume in volume_info:
        try:
            filename = existing_volume.mountpoint + os.sep + TEMP_FILE_NAME
            os.remove(filename)
            logger.info("Found and removed hdd stress test file: '" + filename + "'")
        except OSError:
            pass


def create_temp_file(file_size, filename):
    num_bytes_written = 0
    logger.info("Creating new " + format_bytes(file_size) + " byte file:" + filename)
    temp_file_handle = open(filename, 'w+')
    write_counter = 1
    while num_bytes_written < file_size:
        # Write file in 1 GB chunks
        block_size = 2 ** 30
        if (file_size - num_bytes_written) >= block_size:
            print("Write " + str(write_counter) + "/" + str(int(math.ceil(file_size/block_size))))
            temp_file_contents = ' ' * block_size
        else:
            temp_file_contents = ' ' * (file_size - num_bytes_written)
        num_bytes_written += block_size
        temp_file_handle.write(temp_file_contents)
        write_counter += 1


def hdd_test(args, parser):
    logger.info("Starting Hard Drive Stress Test")
    logger.info("===============================")
    logger.info("")
    percent = args.percent
    seconds = args.seconds
    target_volumes = args.volumes
    if not percent or not seconds or not target_volumes:
        error_message = "-v, -p and -s must all be specified for hard drive stress testing. See %s --help" % sys.argv[0]
        parser.error(error_message)
        logger.error(error_message)
        exit(1)
    if seconds <= 0:
        logger.warning("Non-positive running time specified. Exiting.")
        exit(1)
    if percent <= 0:
        logger.warning("Non-positive RAM percentage specified. Exiting.")
        exit(1)
    case_insensitive = not is_file_system_is_case_sensitive()
    target_volumes = target_volumes.split(",")
    if len(target_volumes) < 1:
        logger.warning("No volumes specified. Exiting.")
    volume_info = get_drive_stats()
    valid_mount_points = []
    for existing_volume in volume_info:
        if (existing_volume.mountpoint in target_volumes) or (case_insensitive and (existing_volume.mountpoint.lower()
                                                              in map(lambda x: x.lower(), target_volumes))):
            if existing_volume.opts.startswith("rw"):
                valid_mount_points.append(existing_volume.mountpoint)
            else:
                error_string = existing_volume.mountpoint + " (" + existing_volume.mountpoint + ") "
                error_string += " found, but is not writable. Opts:" + existing_volume.opts
                logger.error(error_string)
    if len(valid_mount_points) < 1:
        logger.warning("No valid mount points found. Exiting.")
        exit(1)
    atexit.register(remove_temp_files)
    for current_volume in valid_mount_points:
        disk_info = psutil.disk_usage(current_volume)
        logger.info(disk_info)
        num_bytes_to_use = int(math.floor(((percent / 100.0) * disk_info.total - (disk_info.total -
                                                                                  disk_info.free))))
        if num_bytes_to_use < 1:
            logger.warning("Current disk usage on volume " + current_volume + " ("+str(disk_info.percent) +
                           ") exceeds specified percentage (" + str(percent) + "). Nothing will be written to disc.")
        filename = current_volume + os.sep + TEMP_FILE_NAME
        create_temp_file(num_bytes_to_use, filename)
    logger.info("All temp files created. Files will be deleted after " + format_bytes(seconds) + " seconds.")
    time.sleep(seconds)
    logger.info("Deleting temp files...")
    remove_temp_files()
    logger.info("Done")
    logger.info("***** HDD Stress Test Complete.")
    logger.info("")


def cpu_test(args, parser):
    logger.info("Starting CPU Stress Test")
    logger.info("========================")
    logger.info("")
    seconds = args.seconds
    target_core_count = args.core_count
    if not target_core_count or not seconds:
        error_message = "-v, -p and -s must all be specified for hard drive stress testing. See %s --help" % \
                        sys.argv[0]
        parser.error(error_message)
        logger.error(error_message)
        exit(1)
    if seconds <= 0:
        logger.warning("Non-positive running time specified. Exiting.")
        exit(1)
    if target_core_count <= 0:
        logger.warning("Non-positive CPU core count specified. Exiting.")
        exit(1)
    num_cores_present = psutil.cpu_count()
    message = "%d cores present on machine. %d cores to stress test for %d seconds." % (num_cores_present,
                                                                                       target_core_count, seconds)
    logger.info(message)
    if target_core_count < 1:
        message = "Less than 1 core specified. Nothing to do. Exiting."
        logger.warning(message)
        exit(1)
    elif target_core_count >= num_cores_present:
        message = "All cores will be used."
        target_core_count = num_cores_present
        logger.info(message)
    else:
        message = "%d of %d cores will be used; %s%%" % (target_core_count, num_cores_present, "{:.2f}".format(
            (target_core_count/num_cores_present)*100))
        logger.info(message)
    threads = []
    if 1 == 0:
        for cpu_id in range(target_core_count):
            t = threading.Thread(target=cpu_test_worker_thread, args=cpu_id)
            threads.append(t)
    else:
        subprocess.check_output(['stress', '--cpu', str(target_core_count)])
    time.sleep(seconds)
    logger.info("***** CPU Stress Test Complete.")
    logger.info("")


def net_test(args, parser):
    logger.info("Starting Network Stress Test")
    logger.info("============================")
    logger.info("")

    # iperf3 is imported here because some operating systems do not have working builds of the python iperf3 module
    try:
        import iperf3
    except ImportError:
        install_and_import("iperf3")

    seconds = args.seconds
    interface = args.interface
    hostname = args.name
    if not interface or not seconds:
        error_message = "-i and -s must both be specified for network stress testing. See %s --help" % \
                        sys.argv[0]
        parser.error(error_message)
        logger.error(error_message)
        exit(1)
    if seconds <= 0:
        logger.warning("Non-positive running time specified. Exiting.")
        exit(1)
    if len(interface) <= 0:
        logger.warning("No interface specified. Exiting.")
        exit(1)
    client = iperf3.Client()
    client.duration = seconds
    client.server_hostname = hostname
    client.bind_address = interface
    client.run()
    logger.info("***** Network Stress Test Complete.")
    logger.info("")



def main():
    try:
        parser = argparse.ArgumentParser(description='Consume specified percentage of RAM for specified number of seconds.')
        # parser._action_groups.pop()
        required = parser.add_argument_group('required arguments')
        optional = parser.add_argument_group('optional arguments')
        optional.add_argument('-p', '--percent', type=int,
                              help='The total percent of RAM to consume. If that amount of RAM is already consumed. The program will immediately exit')
        optional.add_argument('-c', '--core_count', type=int,
                              help='The number of cores on which to consume 100% CPU usage. To test all cores, specify a number larger than the core count (e.g. 9999)')
        optional.add_argument('-v', '--volumes', type=str,
                              help='Comma separated the volumes names on which to consume the specified amount of hard drive space. DO NOT add spaces between commas. This list IS case sensitive on *NIX and NOT case sensitive on Windows. Trailing slash is optional')
        optional.add_argument('-i', '--interfaces', type=int,
                              help='The name of the interface to consume all network traffic on. E.g. eth0. This test DOES NOT work on windows yet.')
        required.add_argument('-n', '--hostname', type=str,
                              help='The hostname of the machine running iperf3 in server mode.')
        required.add_argument('-s', '--seconds', type=int, required=True,
                              help='The number of seconds to run the test until releasing resources and exiting.')
        required.add_argument('-t', '--test', type=str, required=True,
                              help="""The name of the test to run. <ram, hdd, cpu, net>

                              stress_test.py -t ram -p <percent of RAM to consume> -s <number of seconds to allocate RAM>

                              stress_test.py -t hdd -p <percent of HDD to consume> -s <number of seconds to allocate HDD> --volume
                              <volume names e.g. /sda1,/sda2 or c:,d: this IS case sensitive on linux, NOT case
                              sensitive on windows>

                              stress_test.py -t cpu -s <number of seconds to allocate RAM> -c <number of cores. If less cores are
                              present than specified, all cores are used>

                              stress_test.py -t net -s <number of seconds to allocate RAM> -i <interface names e.g. eth0,eth1>
                              -target <hostname of machine running `iperf3 --server`>""")
        args = parser.parse_args()
        test = args.test
        if test.lower() in ("ram", "hdd", "cpu", "net"):
            if test == "ram":
                ram_test(args, parser)
            elif test == "hdd":
                hdd_test(args, parser)
            elif test == "cpu":
                cpu_test(args, parser)
            elif test == "net":
                net_test(args, parser)
        else:
            logger.warning("Invalid test name '%d'" % test)
            exit(1)
    except Exception:
        run_pre_reqs()
        if not pre_reqs_ran:
            main()
            pre_reqs_ran = True
        else:
            logger.error("Unexpected error:", sys.exc_info()[0])
            raise


if __name__ == '__main__':
    logger = logging.getLogger('stress_test')
    logger.setLevel(logging.DEBUG)
    # create file handler which logs even debug messages
    fh = logging.FileHandler('stress_test.log')
    fh.setLevel(logging.DEBUG)
    # create console handler with a higher log level
    ch = logging.StreamHandler()
    ch.setLevel(logging.DEBUG)
    # create formatter and add it to the handlers
    formatter = logging.Formatter('%(asctime)s - %(name)s - PID:%(process)d - %(levelname)s - %(message)s')
    fh.setFormatter(formatter)
    ch.setFormatter(formatter)
    # add the handlers to the logger
    logger.addHandler(fh)
    logger.addHandler(ch)

    if sys.maxsize <= 2 ** 32:
        logger.warning("32-bit version of python detected. Program might not function properly.")
    main()
