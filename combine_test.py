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
client_t3_t0s = [[], [], []]
client_datas = [[], [], []]
count_errors = [0, 0, 0]
cb_total_reqs = [0, 0, 0]
ts_first_req_t0s = [sys.maxsize, sys.maxsize, sys.maxsize]
ts_last_req_t0s = [-1, -1, -1]
current_test_try = -1
for log_client_path in log_client_paths:
    # see which try we are
    if "_0." in log_client_path:
        current_test_try = 0
    elif "_1." in log_client_path:
        current_test_try = 1
    elif "_2." in log_client_path:
        current_test_try = 2
    # Now open file
    with open(f"{LOG_DATA_DIR}/{log_client_path}") as log_client_f:
        for line in log_client_f:
            res = json.loads(line)
            if res["t0"] < ts_first_req_t0s[current_test_try]:
                ts_first_req_t0s[current_test_try] = res["t0"]
            if res["t0"] > ts_last_req_t0s[current_test_try]:
                ts_last_req_t0s[current_test_try] = res["t0"]

            if res["t3"] > 0:
                client_datas[current_test_try].append(res)
                client_t3_t0s[current_test_try].append(res["t3"] - res["t0"])
            else:
                count_errors[current_test_try] = count_errors[current_test_try] + 1
            cb_total_reqs[current_test_try] = cb_total_reqs[current_test_try] + 1
# Calculate combine data of 3 tries
client_t3_t0 = client_t3_t0s[0] + client_t3_t0s[1] + client_t3_t0s[2]
count_error = sum(count_errors)
cb_total_req = sum(cb_total_reqs)
cb_test_duration = 0
for i in range(0, 3):
    cb_test_duration += ts_last_req_t0s[i] - ts_first_req_t0s[i]


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
print(f"## Test duration: {(cb_test_duration/1000):.2f} sec")
print(f"## Avg: {(cb_total_req/(cb_test_duration/1000)):.2f} req/sec")

### Histogram: latency distribution
fig = plt.figure()
ax = plt.gca()
plt.title(f"Distribution of latency values")
numb_var = np.asarray(client_t3_t0)
numb_var = pd.Series(numb_var, name = f"Request latency (t3-t0) in milisecond")
sns.histplot(data = numb_var, kde=True)

textbox_content = \
    f"{cb_total_req} req in {(cb_test_duration/1000):.2f} sec\n" + \
    f"Avg: {(cb_total_req/(cb_test_duration/1000)):.2f} req/sec\n" + \
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

