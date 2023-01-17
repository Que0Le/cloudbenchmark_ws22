# Load up JSON Function
import json, os, re
import sys
import numpy as np
# Open our JSON file and load it into python
# input_file = open ("outputfile.txt")
# json_array = json.load(input_file)

# print(json_array)


session_id = "test_session"
log_sut_path = "log_sut_" + session_id + ".txt"
# log_client_path = "log_client_" + session_id + ".txt"

log_client_paths = [f for f in os.listdir() if re.search(r'log_client_\d{1,2}_' + session_id + '.txt', f)]
# print(log_client_paths)

client_t3_t0 = []
client_data = []
count_error = 0
count_sum = 0
ts_first_req_t0 = sys.maxsize
ts_last_req_t0 = -1

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

print(np.percentile(client_t3_t0, 95))
print(np.percentile(client_t3_t0, 50))
print(np.percentile(client_t3_t0, 20))
print(np.std(client_t3_t0, ddof=1))
print(f"## Total: {count_sum}, errors: {count_error} ({(count_error*100/count_sum):.2f}%)")
print(f"## Test duration: {((ts_last_req_t0 - ts_first_req_t0)/1000):.2f} sec")
print(f"## Avg: {(count_sum/((ts_last_req_t0 - ts_first_req_t0)/1000)):.2f} req/sec")
# sorted_client_data = sorted(client_data, key=lambda k : k["value"]["t0"]) 

# with open(f"log_client_{session_id}_sorted.txt" , 'w') as fout:
#     for d in sorted_client_data:
#         print(json.dumps(d), file=fout)