
import psutil, time, json
from typing import Union

from fastapi import BackgroundTasks, Depends, FastAPI

app = FastAPI()

COLLECTING_STAT = False
stat = []
index = 0


def collect_stat():
    global COLLECTING_STAT, stat, index
    while COLLECTING_STAT:
        cpu_per = psutil.cpu_percent(interval=None, percpu=True)
        ram_per = psutil.virtual_memory()[2]
        stat.append({"index": index, "cpu_per": cpu_per, "ram_per": ram_per, "timestamp": time.time()})
        index = index + 1
        time.sleep(0.1)
    
    # Export data to file
    with open('outputfile.txt', 'w') as fout:
        json.dump(stat, fout)
    # clear data
    stat = []
    index = 0


# def write_log(message: str):
#     with open("log.txt", mode="a") as log:
#         log.write(message)


# def get_query(background_tasks: BackgroundTasks, q: Union[str, None] = None):
#     if q:
#         message = f"found query: {q}\n"
#         background_tasks.add_task(write_log, message)
#     return q


@app.get("/collect-stat")
async def handle_stat(background_tasks: BackgroundTasks):
    global COLLECTING_STAT, stat
    if COLLECTING_STAT:
        COLLECTING_STAT = False
        return stat
    else:
        COLLECTING_STAT = True
        background_tasks.add_task(collect_stat)
        return "Started collecting"