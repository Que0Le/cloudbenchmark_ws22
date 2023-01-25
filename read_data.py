import json, os, re, string, math, sys
import numpy as np
import matplotlib.pyplot as plt

session_id = sys.argv[1]#"test_session"
log_sut_path = "log_sut_" + session_id + ".txt"

log_client_paths = [f for f in os.listdir() if re.search(r'log_client_\d{1,2}_' + session_id + '.txt', f)]
log_sut_path = f"log_sut_{session_id}.txt"

client_t3_t0 = []
client_data = []
count_error = 0
count_sum = 0
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
            count_sum = count_sum + 1

sorted_client_data = sorted(client_data, key=lambda k : k["t0"]) 

print("--------------------------------- Client ---------------------------------")
# print(np.percentile(client_t3_t0, 95))
# print(np.percentile(client_t3_t0, 50))
# print(np.percentile(client_t3_t0, 20))
# print(np.std(client_t3_t0, ddof=1))
print(f"95%={np.percentile(client_t3_t0, 95)} 50%={np.percentile(client_t3_t0, 50)} 20%={np.percentile(client_t3_t0, 20)} std={np.std(client_t3_t0, ddof=1)}")
print(f"## Total: {count_sum}, errors: {count_error} ({(count_error*100/count_sum):.2f}%)")
print(f"## Test duration: {((ts_last_req_t0 - ts_first_req_t0)/1000):.2f} sec")
print(f"## Avg: {(count_sum/((ts_last_req_t0 - ts_first_req_t0)/1000)):.2f} req/sec")

print("---------------------------------  SUT  ---------------------------------")
with open(log_sut_path) as log_sut_f:
    for line in log_sut_f:
        sut_data.append(json.loads(line))



sut_test_dur_ms = (sut_data[-1]["timestamp"] - sut_data[0]["timestamp"])

cb_test_start_ts = min(sut_data[0]["timestamp"], sorted_client_data[0]["t0"])
cb_test_stop_ts = max(sut_data[-1]["timestamp"], sorted_client_data[-1]["t3"])
cb_test_dur_ms = cb_test_stop_ts - cb_test_start_ts

# sorted_client_data = sorted(client_data, key=lambda k : k["value"]["t0"]) 

# with open(f"log_client_{session_id}_sorted.txt" , 'w') as fout:
#     for d in sorted_client_data:
#         print(json.dumps(d), file=fout)



# def generate_data(N = 20):
#     data = [random.randrange(3) for x in range(N)]
#     A = [i for i, x in enumerate(data) if x == 0]
#     B = [i for i, x in enumerate(data) if x == 1]
#     C = [i for i, x in enumerate(data) if x == 2]
#     return A,B,C

# def to_xy(*events):
#     x, y = [], []
#     for i,event in enumerate(events):
#         y.extend([i]*len(event))
#         x.extend(event)
#     x, y = np.array(x), np.array(y)
#     return x,y

# def event_string(x,y):
#     labels = np.array(list(string.ascii_uppercase))        
#     seq = labels[y[np.argsort(x)]]
#     return seq.tostring()

# def plot_events(x,y):
#     labels = np.array(list(string.ascii_uppercase))    
#     plt.hlines(y, x, x+1, lw = 2, color = 'red')
#     plt.ylim(max(y)+0.5, min(y)-0.5)
#     plt.yticks(range(y.max()+1), labels)
#     # plt.show()
#     plt.savefig(session_id)

# A,B,C = generate_data(20)
# x,y = to_xy(A,B,C)
# print(event_string(x,y))
# plot_events(x,y)


