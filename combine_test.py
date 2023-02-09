import json, os, re, string, math, sys
import numpy as np
import matplotlib.pyplot as plt
from dotenv import load_dotenv
import urllib.request
from cycler import cycler
from matplotlib.colors import hsv_to_rgb
import seaborn as sns
import pandas as pd

load_dotenv()
SERVER_ADDR = os.getenv('SERVER_ADDR')
SERVER_PORT = os.getenv('SERVER_PORT')
LOG_DATA_DIR = os.getenv('LOG_DATA_DIR')

SESSION_ID = sys.argv[1]
if len(sys.argv)==3:
    LOG_DATA_DIR = sys.argv[2]

log_client_paths = [f for f in os.listdir(LOG_DATA_DIR) if SESSION_ID in f and "client" in f]
if len(log_client_paths) == 0:
    print(f"No log files found in '{LOG_DATA_DIR}' for session '{SESSION_ID}'. Exit now")
    exit(-1)

client_t3_t0 = []
client_data = []
count_error = 0
cb_total_req = 0
ts_first_req_t0 = sys.maxsize
ts_last_req_t0 = -1
sut_data = []

print(f"Working session: {SESSION_ID}, data dir: {LOG_DATA_DIR}")

print("--------------------------------- Client ---------------------------------")
# Load client's log files
for log_client_path in log_client_paths:
    with open(f"{LOG_DATA_DIR}/{log_client_path}") as log_client_f:
        for line in log_client_f:
            res = json.loads(line)
            if res["t0"] < ts_first_req_t0:
                ts_first_req_t0 = res["t0"]
            if res["t0"] > ts_last_req_t0:
                ts_last_req_t0 = res["t0"]

            if res["t3"] > 0:
                client_data.append(res)
                client_t3_t0.append(res["t3"] - res["t0"])
            else:
                count_error = count_error + 1
            cb_total_req = cb_total_req + 1
print(f"## Loaded {len(log_client_paths)} client's log files")

# Sort data after request's t0
sorted_after_t0_client_data = sorted(client_data, key=lambda k : k["t0"]) 

# Some statistic (for quick review)
print("## Latency: " + 
    f"99%={np.percentile(client_t3_t0, 99)} " +
    f"95%={np.percentile(client_t3_t0, 95)} " +
    f"50%={np.percentile(client_t3_t0, 50)} " +
    f"20%={np.percentile(client_t3_t0, 20)} " +
    f"min={np.amin(client_t3_t0)} " +
    f"max={np.amax(client_t3_t0)} " +
    f"std={np.std(client_t3_t0, ddof=1)}")
print(f"## Total: {cb_total_req} req, errors: {count_error} ({(count_error*100/cb_total_req):.2f}%)")
print(f"## Test duration: {((ts_last_req_t0 - ts_first_req_t0)/1000):.2f} sec")
print(f"## Avg: {(cb_total_req/((ts_last_req_t0 - ts_first_req_t0)/1000)):.2f} req/sec")


# print("---------------------------------  SUT  ---------------------------------")
# Load data, download if needed
# log_sut_path = f"{LOG_DATA_DIR}/log_sut_{SESSION_ID}.txt"
# if not os.path.isfile(log_sut_path):
#     # Download log from SUT server
#     log_sut_path, msg = urllib.request.urlretrieve(
#         f"http://{SERVER_ADDR}:{SERVER_PORT}/download-stat/{SESSION_ID}", log_sut_path)
#     print(f"## Downloaded log file from server ...")

# with open(log_sut_path) as log_sut_f:
#     for line in log_sut_f:
#         sut_data.append(json.loads(line))
# print(f"## Loaded SUT log file from {log_sut_path}")


# sut_test_dur_ms = (sut_data[-1]["timestamp"] - sut_data[0]["timestamp"])

# cb_test_start_ts = min(sut_data[0]["timestamp"], sorted_after_t0_client_data[0]["t0"])
# cb_test_end_ts = max(sut_data[-1]["timestamp"], sorted_after_t0_client_data[-1]["t3"])
# cb_test_dur_ms = cb_test_end_ts - cb_test_start_ts


# print("---------------------------------  CB  ---------------------------------")
# print(f'cb_test_dur_ms:     {cb_test_dur_ms }  start: {cb_test_start_ts                    } end: {cb_test_end_ts}')
# print(f'sut_test_dur_ms:    {sut_test_dur_ms}  start: {sut_data[0]["timestamp"]            } end: {sut_data[-1]["timestamp"]}')
# print(f'client_test_dur_ms: {sut_test_dur_ms}  start: {sorted_after_t0_client_data[0]["t0"]} end: {sorted_after_t0_client_data[-1]["t3"]}')


latencies_t3_t0 = []
# xmin, xmaxfloat or array-like. Respective beginning and end of each line.
# sorted_after_req_id_client_data = sorted(client_data, key=lambda k : k["req_id"])
# req_xmin = []       
# req_xmax = []
# for req in sorted_after_req_id_client_data:
#     req_xmin.append(req["t0"] - cb_test_start_ts)
#     req_xmax.append(req["t3"] - cb_test_start_ts)
#     latencies_t3_t0.append(req["t3"] - req["t0"])

# sut_avg_cpu = []
# sut_timestamp = []
# sut_nbr_core = len(sut_data[0]["cpu_per"])

# for sut_stat_line in sut_data:
#     sut_avg_cpu.append(sum(sut_stat_line["cpu_per"]) / len(sut_stat_line["cpu_per"]))
#     sut_timestamp.append(sut_stat_line["timestamp"] - cb_test_start_ts)



### Plot start and end timestamp of requests
# y: list = range(0, cb_total_req - count_error)
# 1000 distinct colors:
# colors = [hsv_to_rgb([(i * 0.618033988749895) % 1.0, 1, 1])
#           for i in range(100)]


# fig, ax1 = plt.subplots()
# ax2 = ax1.twinx()

# Plot left side (req id)
# ax1.hlines(y, req_xmin, req_xmax, lw = 2, color = colors)
# ax1.set_xlabel(f"Timestamp (in milisecond) since test begin")
# ax1.set_ylabel('Rquest ID')
# ax1.set_ylim(max(y) * 1.1, - max(y) * 0.1)
# ax1.invert_yaxis()
# # Plot right side (cpu usage)
# ax2.plot(sut_timestamp, sut_avg_cpu, 'lightslategray')
# ax2.set_ylabel(f'SUT CPU usage ({sut_nbr_core} vCores)')
# ax2.set_ylim(110, -10)
# ax2.invert_yaxis()

# plt.figtext(
#     0.5, 0.01, 
#     f"{SESSION_ID.replace('.', '|')}", ha="center", 
#     fontsize=10, bbox={"facecolor":"orange", "alpha":0.5, "pad":5}
# )
# plt.title(f"Monitor of request flood and server's CPU usage")
# fig1_path = f"{LOG_DATA_DIR}/fig_dev_{SESSION_ID}.png"
# plt.subplots_adjust(bottom=0.15)
# plt.savefig(fig1_path, dpi=800)
# print(f"Exported figure: {fig1_path}")


### Histogram: latency distribution
fig = plt.figure()
ax = plt.gca()
plt.title(f"Distribution of latency values")
numb_var = np.asarray(client_t3_t0)
numb_var = pd.Series(numb_var, name = f"Request latency (t3-t0) in milisecond")
sns.histplot(data = numb_var, kde=True)

textbox_content = \
    f"{cb_total_req} req in {((ts_last_req_t0 - ts_first_req_t0)/1000):.2f} sec\n" + \
    f"Avg: {(cb_total_req/((ts_last_req_t0 - ts_first_req_t0)/1000)):.2f} req/sec\n" + \
    f"Latencies: std={round(np.std(client_t3_t0, ddof=1), 2)}\n" + \
    f"min={np.amin(client_t3_t0)} " + \
    f"max={np.amax(client_t3_t0)}\n" + \
    f"99%={round(np.percentile(client_t3_t0, 99), 2)} " + \
    f"95%={round(np.percentile(client_t3_t0, 95), 2)}\n" + \
    f"50%={round(np.percentile(client_t3_t0, 50), 2)} " + \
    f"20%={round(np.percentile(client_t3_t0, 20), 2)}\n"

left, width = .48, .5
bottom, height = .48, .5
right = left + width
top = bottom + height
ax.text(right, top, textbox_content,
        horizontalalignment='right',
        verticalalignment='top',
        transform=ax.transAxes)
plt.figtext(
    0.5, 0.01, 
    f"combined_{SESSION_ID.replace('.', '|')}", ha="center", 
    fontsize=10, bbox={"facecolor":"orange", "alpha":0.5, "pad":5}
)
fig2_path = f"{LOG_DATA_DIR}/combined_hist_{SESSION_ID}.png"
plt.subplots_adjust(bottom=0.15)
plt.savefig(fig2_path, dpi=800)
print(f"Exported figure: {fig2_path}")

