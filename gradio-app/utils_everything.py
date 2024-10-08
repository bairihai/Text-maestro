# utils_everything.py 需要后台启动everything，使用其SDK才能实现的功能。
# 可选项。好处是快，快很多倍。

import ctypes
import datetime
import struct
import os

# 定义
# defines
EVERYTHING_REQUEST_FILE_NAME = 0x00000001
EVERYTHING_REQUEST_PATH = 0x00000002
EVERYTHING_REQUEST_FULL_PATH_AND_FILE_NAME = 0x00000004
EVERYTHING_REQUEST_EXTENSION = 0x00000008
EVERYTHING_REQUEST_SIZE = 0x00000010
EVERYTHING_REQUEST_DATE_CREATED = 0x00000020
EVERYTHING_REQUEST_DATE_MODIFIED = 0x00000040
EVERYTHING_REQUEST_DATE_ACCESSED = 0x00000080
EVERYTHING_REQUEST_ATTRIBUTES = 0x00000100
EVERYTHING_REQUEST_FILE_LIST_FILE_NAME = 0x00000200
EVERYTHING_REQUEST_RUN_COUNT = 0x00000400
EVERYTHING_REQUEST_DATE_RUN = 0x00000800
EVERYTHING_REQUEST_DATE_RECENTLY_CHANGED = 0x00001000
EVERYTHING_REQUEST_HIGHLIGHTED_FILE_NAME = 0x00002000
EVERYTHING_REQUEST_HIGHLIGHTED_PATH = 0x00004000
EVERYTHING_REQUEST_HIGHLIGHTED_FULL_PATH_AND_FILE_NAME = 0x00008000

# 获取当前文件夹路径
current_dir = os.path.dirname(os.path.abspath(__file__))
# 构建相对路径，用相对路径手动导入everything-sdk dll
dll_path = os.path.join(current_dir, "Everything-SDK", "dll", "Everything64.dll")
everything_dll = ctypes.WinDLL(dll_path)

# dll 导入，引入SDK基础内容
# dll imports
everything_dll.Everything_GetResultDateModified.argtypes = [ctypes.c_int,ctypes.POINTER(ctypes.c_ulonglong)]
everything_dll.Everything_GetResultSize.argtypes = [ctypes.c_int,ctypes.POINTER(ctypes.c_ulonglong)]
everything_dll.Everything_GetResultFileNameW.argtypes = [ctypes.c_int]
everything_dll.Everything_GetResultFileNameW.restype = ctypes.c_wchar_p


# 将 Windows FILETIME 转换为 Python datetime
# convert a windows FILETIME to a python datetime
# https://stackoverflow.com/questions/39481221/convert-datetime-back-to-windows-64-bit-filetime
WINDOWS_TICKS = int(1/10**-7)  # 10,000,000 (100 nanoseconds or .1 microseconds)
WINDOWS_EPOCH = datetime.datetime.strptime('1601-01-01 00:00:00',
                                           '%Y-%m-%d %H:%M:%S')
POSIX_EPOCH = datetime.datetime.strptime('1970-01-01 00:00:00',
                                         '%Y-%m-%d %H:%M:%S')
EPOCH_DIFF = (POSIX_EPOCH - WINDOWS_EPOCH).total_seconds()  # 11644473600.0
WINDOWS_TICKS_TO_POSIX_EPOCH = EPOCH_DIFF * WINDOWS_TICKS  # 116444736000000000.0

def get_time(filetime):
    """将 Windows filetime winticks 转换为 Python datetime.datetime"""
    """Convert windows filetime winticks to python datetime.datetime."""
    winticks = struct.unpack('<Q', filetime)[0]
    microsecs = (winticks - WINDOWS_TICKS_TO_POSIX_EPOCH) / WINDOWS_TICKS
    return datetime.datetime.fromtimestamp(microsecs)

# 功能：硬编码测试everything-sdk效果（仅供测试用）
def test():
    # 设置搜索，也就是everything软件那个搜索栏
    # setup search
    everything_dll.Everything_SetSearchW("test.py")
    everything_dll.Everything_SetRequestFlags(EVERYTHING_REQUEST_FILE_NAME | EVERYTHING_REQUEST_PATH | EVERYTHING_REQUEST_SIZE | EVERYTHING_REQUEST_DATE_MODIFIED)

    # 执行查询
    # execute the query
    everything_dll.Everything_QueryW(1)

    # 获取结果数量
    # get the number of results
    num_results = everything_dll.Everything_GetNumResults()

    # 显示结果数量
    # show the number of results
    print("Result Count: {}".format(num_results))

    # 创建缓冲区
    # create buffers
    filename = ctypes.create_unicode_buffer(260)
    date_modified_filetime = ctypes.c_ulonglong(1)
    file_size = ctypes.c_ulonglong(1)

    # 显示结果
    # show results
    for i in range(num_results):

        everything_dll.Everything_GetResultFullPathNameW(i,filename,260)
        everything_dll.Everything_GetResultDateModified(i,date_modified_filetime)
        everything_dll.Everything_GetResultSize(i,file_size)
        print("Filename: {}\nDate Modified: {}\nSize: {} bytes\n".format(ctypes.wstring_at(filename),get_time(date_modified_filetime),file_size.value))

# 功能：指定一个文件夹，获取里面所有文件的 filename，可以选择“是否搜索子目录” “是否绝对路径”
def search_files_in_directory(directory, search_subdirectories, full_path, search_only_files):  
    # 设置搜索
    if search_subdirectories:
        search_query = f'"{directory}\\*"'
    else:
        search_query = f'parent:"{directory}"'

    if search_only_files:  
        search_query = f'file:{search_query}'

    everything_dll.Everything_SetSearchW(search_query)
    if full_path:
        everything_dll.Everything_SetRequestFlags(EVERYTHING_REQUEST_FULL_PATH_AND_FILE_NAME)
    else:
        everything_dll.Everything_SetRequestFlags(EVERYTHING_REQUEST_FILE_NAME)
    everything_dll.Everything_QueryW(1)

    num_results = everything_dll.Everything_GetNumResults()
    filenames = []

    for i in range(num_results):
        buffer_size = 260
        buffer = ctypes.create_unicode_buffer(buffer_size)
        if full_path:
            everything_dll.Everything_GetResultFullPathNameW(i, buffer, buffer_size)
        else:
            buffer.value = everything_dll.Everything_GetResultFileNameW(i)
        filenames.append(buffer.value)

    return filenames

# 示例调用：测试 search_files_in_directory 函数。
# __main__确保以下代码块仅在脚本作为主程序运行时执行，而在作为模块导入时不会执行。
if __name__ == "__main__":
    directory = "D:\\My Program\\novelai-webui-aki-v2"
    search_subdirectories = True
    files = search_files_in_directory(directory, search_subdirectories)
    for file in files:
        print(file)