# Load up JSON Function
import json

# Open our JSON file and load it into python
# input_file = open ("outputfile.txt")
# json_array = json.load(input_file)

# print(json_array)


session_id = "test_session"
log_sut_path = "log_sut_" + session_id + ".txt"
log_client_path = "log_client_" + session_id + ".txt"



with open(log_sut_path) as log_sut_f:
    for line in log_sut_f:
        res = json.loads(line)
        print(res[0])
        break