import matplotlib.pyplot as plt
import pandas as pd

if __name__ == "__main__":
    num2 = pd.read_excel('RawData/CPUUsage.xlsx', parse_cols='A')
    cu = pd.read_excel('RawData/CPUUSage.xlsx', parse_cols='B')
    plt.plot(num2, cu)
    plt.savefig('./illustration/CPUUsage.png')
    plt.clf()

    num1 = pd.read_excel('RawData/MemoryUsage.xlsx', parse_cols='A')
    mu = pd.read_excel('RawData/MemoryUsage.xlsx', parse_cols='B')
    plt.plot(num1, mu)
    plt.savefig('./illustration/MemoryUsage.png')
