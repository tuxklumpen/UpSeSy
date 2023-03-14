import json
import datetime as dt
import click

timef = "%Y-%m-%dT%H:%M:%S"

def slot(name, start, content, questions, gracetime, showclock=False, talktype="regular"):
    t = {
        "speaker" : name.strip(),
        "start" : start.strftime(timef),
        "showclock" : showclock,
        "kind" : talktype
        # "lengths" : {
        #     "content" : content,
        #     "questions" : questions,
        #     "gracetime" : gracetime
        # }
    }
    print(t)
    
    return t

@click.command()
@click.option('--sessions', default=2, help="Number of sessions, names will be Session A, B ...")
@click.option('--talks', default=3, help="Number of talks per session to create")
@click.option('--content', default=15, help="Number of seconds that the content of a talk is long")
@click.option('--questions', default=10, help="Number of seconds that the questions of a talk is long")
@click.option('--gracetime', default=5, help="Number of seconds that the gracetime-time of a talk is long")
@click.option('--warnspeaker', default=5, help="Number of seconds that the time switches to warning color before content of talk ends")
@click.option('--start', type=click.DateTime(formats=[timef]), default=dt.datetime.today().strftime(timef))
@click.option('--pauseevery', default=5, help="Put pause every x talks.")
@click.argument('outfile')
def main(sessions, talks, start, content, questions, gracetime, pauseevery, warnspeaker, outfile):
    names = []
    with open("pokemon", "r") as p:
        names = p.readlines()
        
    schedule = {"sessions" : {}, "global" : {}}
    i = 0
    slotlength = content + gracetime + questions
    delta = dt.timedelta(seconds=slotlength)
    for s in range(sessions):
        session = {}
        session["thetalks"] = []
        for t in range(talks):
            stime = start + t * delta
            if (t+1) % pauseevery == 0:
                session["thetalks"].append(slot("COFFEEEE", stime, slotlength, 0, 0, True, "pause"))
            else:
                session["thetalks"].append(slot(names[i], stime, content, questions, gracetime))
            i = i + 1
            
        schedule["sessions"][f"Session {s}"] = session
        
    schedule["global"] = {
        "content" : content,
        "questions" : questions,
        "gracetime" : gracetime,
        "warnspeaker" : warnspeaker
    }
        
    print(schedule)
    with open(outfile, "w") as f:
        f.write(f"let schedule='{json.dumps(schedule)}'")

if __name__ == "__main__":
    main()