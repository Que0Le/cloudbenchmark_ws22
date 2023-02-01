import json, os, re, string, math, sys
import numpy as np
import matplotlib.pyplot as plt
from dotenv import load_dotenv
import urllib.request
from cycler import cycler
from matplotlib.colors import hsv_to_rgb

load_dotenv()
SERVER_ADDR = os.getenv('SERVER_ADDR')
SERVER_PORT = os.getenv('SERVER_PORT')

SESSION_ID = sys.argv[1]#"test_session"
log_sut_path = "log_sut_" + SESSION_ID + ".txt"

log_client_paths = [f for f in os.listdir() if re.search(r'log_client_\d{1,2}_' + SESSION_ID + '.txt', f)]
log_sut_path = f"log_sut_{SESSION_ID}.txt"

client_t3_t0 = []
client_data = []
count_error = 0
cb_total_req = 0
ts_first_req_t0 = sys.maxsize
ts_last_req_t0 = -1
sut_data = []


for log_client_path in log_client_paths:
    with open(log_client_path) as log_client_f:
        for line in log_client_f:
            res = json.loads(line)
            if res["t0"] < ts_first_req_t0:
                ts_first_req_t0 = res["t0"]
            if  res["t0"] > ts_last_req_t0:
                ts_last_req_t0 = res["t0"]

            if res["t3"] > 0:
                client_data.append(res)
                client_t3_t0.append(res["t3"] - res["t0"])
            else:
                count_error = count_error + 1
            cb_total_req = cb_total_req + 1

sorted_after_t0_client_data = sorted(client_data, key=lambda k : k["t0"]) 

print("--------------------------------- Client ---------------------------------")
# print(np.percentile(client_t3_t0, 95))
# print(np.percentile(client_t3_t0, 50))
# print(np.percentile(client_t3_t0, 20))
# print(np.std(client_t3_t0, ddof=1))
print(
    f"99%={np.percentile(client_t3_t0, 99)} " +
    f"95%={np.percentile(client_t3_t0, 95)} " +
    f"50%={np.percentile(client_t3_t0, 50)} " +
    f"20%={np.percentile(client_t3_t0, 20)} " +
    f"min={np.amin(client_t3_t0)} " +
    f"max={np.amax(client_t3_t0)} " +
    f"std={np.std(client_t3_t0, ddof=1)}")
print(f"## Total: {cb_total_req}, errors: {count_error} ({(count_error*100/cb_total_req):.2f}%)")
print(f"## Test duration: {((ts_last_req_t0 - ts_first_req_t0)/1000):.2f} sec")
print(f"## Avg: {(cb_total_req/((ts_last_req_t0 - ts_first_req_t0)/1000)):.2f} req/sec")

print("---------------------------------  SUT  ---------------------------------")
# Download log from SUT server
urllib.request.urlretrieve(
    f"http://{SERVER_ADDR}:{SERVER_PORT}/download-stat/{SESSION_ID}", f"log_sut_{SESSION_ID}.txt")

with open(log_sut_path) as log_sut_f:
    for line in log_sut_f:
        sut_data.append(json.loads(line))



sut_test_dur_ms = (sut_data[-1]["timestamp"] - sut_data[0]["timestamp"])

cb_test_start_ts = min(sut_data[0]["timestamp"], sorted_after_t0_client_data[0]["t0"])
cb_test_end_ts = max(sut_data[-1]["timestamp"], sorted_after_t0_client_data[-1]["t3"])
cb_test_dur_ms = cb_test_end_ts - cb_test_start_ts

print("---------------------------------  CB  ---------------------------------")
print(f'cb_test_dur_ms:     {cb_test_dur_ms }  start: {cb_test_start_ts                    } end: {cb_test_end_ts}')
print(f'sut_test_dur_ms:    {sut_test_dur_ms}  start: {sut_data[0]["timestamp"]            } end: {sut_data[-1]["timestamp"]}')
print(f'client_test_dur_ms: {sut_test_dur_ms}  start: {sorted_after_t0_client_data[0]["t0"]} end: {sorted_after_t0_client_data[-1]["t3"]}')


# xmin, xmaxfloat or array-like. Respective beginning and end of each line.
sorted_after_req_id_client_data = sorted(client_data, key=lambda k : k["req_id"])
req_xmin = []       
req_xmax = []
for req in sorted_after_req_id_client_data:
    req_xmin.append(req["t0"] - cb_test_start_ts)
    req_xmax.append(req["t3"] - cb_test_start_ts)


sut_avg_cpu = []
sut_timestamp = []
for sut_stat_line in sut_data:
    sut_avg_cpu.append(sum(sut_stat_line["cpu_per"]) / len(sut_stat_line["cpu_per"]))
    sut_timestamp.append(sut_stat_line["timestamp"] - cb_test_start_ts)



### Plot start and end of requests
y: list = range(0, cb_total_req)
# 1000 distinct colors:
colors = [hsv_to_rgb([(i * 0.618033988749895) % 1.0, 1, 1])
          for i in range(100)]
# plt.hlines(y, req_xmin, req_xmax, lw = 2, color = colors)
# plt.ylim(max(y) * 1.1, - max(y) * 0.1)
# plt.yticks([])      # Disable tick for now. Later: select 10 labels?


fig, ax1 = plt.subplots()
ax2 = ax1.twinx()

# Plot left side (req id)
ax1.hlines(y, req_xmin, req_xmax, lw = 2, color = colors)
ax1.set_xlabel('Timestamp (in milisecond) since test begin')
ax1.set_ylabel('Rquest ID')
ax1.set_ylim(max(y) * 1.1, - max(y) * 0.1)
ax1.invert_yaxis()
# Plot right side (cpu usage)
ax2.plot(sut_timestamp, sut_avg_cpu, 'lightslategray')
ax2.set_ylabel('CPU time average')
ax2.set_ylim(110, -10)
ax2.invert_yaxis()

# plt.gca().invert_yaxis()
plt.title('Start and end timestamp of requests sorted by request ID')
# plt.xlabel('Timestamp (in milisecond) since test begin')
# plt.ylabel('Request-th sent to server')
plt.savefig("fig_dev_" + SESSION_ID + ".png", dpi=800)


### Calculate requests/sec by interval
# How many requests/100ms or 200ms or 1s 