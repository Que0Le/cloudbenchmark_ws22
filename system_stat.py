
from uvicorn.main import Server
import psutil, time, json, os
from typing import Union

from fastapi import BackgroundTasks, Depends, FastAPI, status, Response
from fastapi.responses import FileResponse

app = FastAPI()

COLLECTING_STAT = False
stat = []
index = 0
global_session_name = ""

# handle terminating background tasks with Ctrl+C 
original_handler = Server.handle_exit
class AppStatus:
    should_exit = False
    
    @staticmethod
    def handle_exit(*args, **kwargs):
        AppStatus.should_exit = True
        original_handler(*args, **kwargs)

Server.handle_exit = AppStatus.handle_exit


def collect_stat():
    """ This function runs in background, collect stat data and export to file when signed to """
    global COLLECTING_STAT, stat, index, global_session_name
    while COLLECTING_STAT and not AppStatus.should_exit:
        cpu_per = psutil.cpu_percent(interval=None, percpu=True)
        ram_per = psutil.virtual_memory()[2]
        stat.append({"index": index, "cpu_per": cpu_per, "ram_per": ram_per, "timestamp": round(time.time()*1000)})
        if index%20 == 0:
            print(f"-- Collected data session_name={global_session_name}, current i={index} ...")
        index = index + 1
        time.sleep(0.1)
    
    # Export data to file
    filename = "outputfile"
    if global_session_name != "":
        filename = global_session_name

    with open("log_sut_" + filename + ".txt", 'w') as fout:
        for s in stat:
            print(json.dumps(s), file=fout)
    with open("log_sut_" + filename + ".json", 'w') as fout:
        json.dump(stat, fout)
    # clear data
    stat = []
    print(f"-- Done collection data for session_name={global_session_name} total={index} iterations.")
    index = 0
    global_session_name = ""


@app.get("/test-collecting/")
async def read_item(response: Response, session_name: str = "123321", limit: int = 10):
    print(session_name, limit)
    response.status_code = status.HTTP_400_BAD_REQUEST
    return {"message": "This is a test"}

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


@app.get("/start-collecting/", status_code=status.HTTP_201_CREATED)
async def start_collecting(background_tasks: BackgroundTasks, response: Response, session_name: str = ""):
    """ Endpoint to signal server collecting stat. Will stop any currently running task """
    global COLLECTING_STAT, stat, global_session_name
    if COLLECTING_STAT:
        COLLECTING_STAT = False
        response.status_code = status.HTTP_400_BAD_REQUEST
        return {
            "message": "Request start-collecting while a task in process. Killing old one ...", 
            "session_name" : global_session_name, "len_stat": len(stat)
        }

    COLLECTING_STAT = True
    global_session_name = session_name
    background_tasks.add_task(collect_stat)
    return {"message": "Started collecting", "session_name" : global_session_name}


@app.get("/stop-collecting", status_code=status.HTTP_202_ACCEPTED)
async def stop_collecting(response: Response, session_name: str = ""):
    """ Endpoint to signal server stop collecting stat """
    global COLLECTING_STAT, stat, global_session_name
    if COLLECTING_STAT:
        len_stat = len(stat)
        COLLECTING_STAT = False
        
        return {"message": "Client requested stop-collecting", "session_name" : global_session_name, "len_stat": len_stat}
    
    response.status_code = status.HTTP_400_BAD_REQUEST
    return {"message": "Client requested stop-collecting but no task in progress", "session_name" : global_session_name, "len_stat": len_stat}


@app.get("/download-stat/{session_id}")
async def get_stat_by_session_id(session_id: str):
    """ Download stat file using File Response """
    if os.path.isfile("./" + "log_sut_" + session_id + ".txt"):
        return FileResponse("./" + "log_sut_" + session_id + ".txt")