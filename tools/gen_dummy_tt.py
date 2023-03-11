import json
import datetime as dt
import click

timef = "%Y-%m-%dT%H:%M:%S"

def talk(name, start, end, showclock=False, talktype="regular"):
    t = {
        "speaker" : name.strip(),
        "start" : start.strftime(timef),
        "end" : end.strftime(timef),
        "showclock" : showclock,
        "kind" : talktype
    }
    print(t)
    
    return t

@click.command()
@click.option('--sessions', default=2, help="Number of sessions, names will be Session A, B ...")
@click.option('--talks', default=3, help="Number of talks per session to create")
@click.option('--length', default=10, help="Number of seconds that a talk is long")
@click.option('--start', type=click.DateTime(formats=[timef]), default=dt.datetime.today().strftime(timef))
@click.option('--pauseevery', default=5, help="Put pause every x talks.")
@click.argument('outfile')
def main(sessions, talks, length, start, pauseevery, outfile):
    names = []
    with open("pokemon", "r") as p:
        names = p.readlines()
        
    schedule = {}
    i = 0
    delta = dt.timedelta(seconds=length)
    for s in range(sessions):
        session = {}
        session["thetalks"] = []
        for t in range(talks):
            stime = start + t * delta
            etime = stime + delta
            if (t+1) % pauseevery == 0:
                session["thetalks"].append(talk("COFFEEEE", stime, etime, True, "pause"))
            else:
                session["thetalks"].append(talk(names[i], stime, etime))
            i = i + 1
            
        schedule[f"Session {s}"] = session
        
    print(schedule)
    with open(outfile, "w") as f:        
        json.dump(schedule, f)

if __name__ == "__main__":
    main()