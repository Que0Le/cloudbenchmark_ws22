# Load up JSON Function
import json

# Open our JSON file and load it into python
input_file = open ("outputfile.txt")
json_array = json.load(input_file)

print(json_array)