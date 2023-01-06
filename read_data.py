# Load up JSON Function
import json, os, re
import numpy as np
# Open our JSON file and load it into python
# input_file = open ("outputfile.txt")
# json_array = json.load(input_file)

# print(json_array)


session_id = "test_session"
log_sut_path = "log_sut_" + session_id + ".txt"
# log_client_path = "log_client_" + session_id + ".txt"

log_client_paths = [f for f in os.listdir() if re.search(r'log_client_\d{1,2}_' + session_id + '.txt', f)]


client_t3_t0 = []
client_data = []

for log_client_path in log_client_paths:
    with open(log_client_path) as log_client_f:
        for line in log_client_f:
            res = json.loads(line)
            if res["t3"] > 0:
                client_data.append(res)
                client_t3_t0.append(res["t3"] - res["t0"])

print(np.percentile(client_t3_t0, 95))
print(np.percentile(client_t3_t0, 50))
print(np.percentile(client_t3_t0, 20))
print(np.std(client_t3_t0, ddof=1))

# sorted_client_data = sorted(client_data, key=lambda k : k["value"]["t0"]) 

# with open(f"log_client_{session_id}_sorted.txt" , 'w') as fout:
#     for d in sorted_client_data:
#         print(json.dumps(d), file=fout)