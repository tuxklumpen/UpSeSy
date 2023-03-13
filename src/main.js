import schedule from '../dist/assets/schedule.json';

// Is talkA starting after talkB
function startingBefore(talkA, talkB) {
    return talkA.start < talkB.start;
}

function myNow() {
    return new Date(Date.now());
}

function getHoursMinutes(date, padding=2, seperator=":") {
    return String(date.getHours()).padStart(padding, '0') + seperator + String(date.getMinutes()).padStart(padding, '0')
}

class Timer {
    constructor(start, end, showclock) {
        this.start = start;
        this.end = end;
        this.showclock = showclock;
    }

    remaining(now) {
        return this.end ? this.end - now : 1;
    }

    isrunning(now) {
        return this.start <= now && this.end > now;
    }

    _draw(now, remaining) {
        if(!this.showclock) {
            const minutes = String(Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60)));
            const seconds = String(Math.floor((remaining % (1000 * 60)) / 1000));

            console.log(this);
            document.getElementById("countdown").innerHTML = minutes.padStart(2, '0') + ":" + seconds.padStart(2, '0');
        }
        else {
            document.getElementById("countdown").innerHTML = getHoursMinutes(now);
        }
    }

    prepare() {

    }

    startTime() {
        return String(this.start.getHours())
    }

    run(session) {
        var now = myNow();
        var remaining = this.remaining(now);
        this._draw(now, remaining);

        var id = setInterval( () => {
            now = myNow();
            remaining = this.remaining(now);
            
            if(remaining < 0) {
                clearInterval(id);
                session.advanceSession();
            }
            else {
                this._draw(now, remaining);
            }
        }, 1000);   
    }

    description() {
        throw new Error("Not implemented!");
    }

    nextDescription() {
        return this.description() + " @ " + getHoursMinutes(this.start);   
    }
}

function makeTalk(json) {
    const speaker = json.speaker;
    const start = new Date(json.start);
    const end = new Date(json.end);
    const showclock = json.showclock;
    
    return new Talk(speaker, start, end, showclock);
}

class Talk extends Timer {
    constructor(speaker, start, end, showclock) {
        super(start, end, showclock);
        this.speaker = speaker;
    }
    
    prepare() {
        super.prepare();
        document.getElementById("currentSpeaker").innerHTML = "Currently: " + this.description();
    }

    description() {
        return this.speaker;
    }
}

function makePause(json) {
    const desc = json.speaker;
    const start = new Date(json.start);
    const end = new Date(json.end);
    const showclock = json.showclock;

    return new Pause(desc, start, end, showclock);
}

function makeGenericPause(start, end) {
    return new Pause("Session is paused", start, end, true);
}

class Pause extends Timer  {
    constructor(desc, start, end, showclock) {
        super(start, end, showclock);
        this.desc = desc;
    }

    prepare() {
        super.prepare();
        document.getElementById("currentSpeaker").innerHTML = "Currently: " + this.description();
    }

    description() {
        return this.desc;
    }
}

class EndOfSession extends Timer {
    constructor(start) {
        super(start, null, true);
    }

    prepare() {
        super.prepare();
        document.getElementById("currentSpeaker").innerHTML = this.description();
    }

    description() {
        return "Session has ended";
    }
}

class Session {
    constructor(json, now) {
        this.upcoming = Array();
        this.past = Array();

        json.thetalks.forEach( (talk) => {
            let thetalk = null;
            if(talk.kind == "regular") {
                console.log("Making regular talk for ", talk.speaker);
                thetalk = makeTalk(talk);
            }
            else if(talk.kind == "pause") {
                console.log("Adding a pause for ", talk.speaker);
                thetalk = makePause(talk);
            }
            else
                throw new Error("Do not know this kind of talk ", talk.kind);

            if(thetalk.end < now)
                this.past.push(thetalk);
            else
                this.upcoming.push(thetalk);
        });

        this.upcoming = this.upcoming.sort(startingBefore);
        this.past = this.past.sort(startingBefore);
        this.interval = null;
    }

    advanceSession() {
        this._updateCurrentTalk();
        console.log(this.current);
        this._displayNext();
        this.current.prepare();
        this.current.run(this);
    }

    runSession() {
        if(this.interval)
            clearInterval(this.interval);

        this.advanceSession();
    }

    _lastTalkRunning() {
        return this._nextTalk() === null;
    }

    _endOfSession() {
        return this._nextTalk() === null && this.current === null;
    }

    _updateCurrentTalk() {
        this.past.push(this.current);

        const now = myNow();
        const next = this._nextTalk();
        if(next) {
            console.log("next: ", next);
            console.log("next: ", next.isrunning(now));
            if(next.isrunning(now))
                this.current = this.upcoming.pop();
            else
                this.current = makeGenericPause(now, next.start);
        }
        else {
            this.current = new EndOfSession(now);
        }
    }

    _nextTalk() {
        if(this.upcoming.length === 0)
            return null;

        return this.upcoming.at(-1);
    }

    _displayNext() {
        if(!this._lastTalkRunning()) {
            document.getElementById("nextSpeaker").innerHTML = "Next: " + this._nextTalk().nextDescription();
        }
        else {
            document.getElementById("nextSpeaker").classList.add("has-text-light");
            document.getElementById("nextSpeaker").innerHTML = "Next";
        }
    }
}

function clearIntervals() {
    const interval_id = window.setInterval(function(){}, Number.MAX_SAFE_INTEGER);
    for (let i = 1; i < interval_id; i++) {
        window.clearInterval(i);
    }
}

function loadSession(event) {
    clearIntervals();
    document.getElementById("currentSpeaker").classList.remove("has-text-light");
    document.getElementById("nextSpeaker").classList.remove("has-text-light");
    const sessionName = event.currentTarget.value;
    const sessionSelector = document.getElementById("sessionSelector");
    sessionSelector.innerHTML = sessionName;
    const session = new Session(schedule[sessionName], myNow());
    session.runSession();
}

window.onload = function() {
    var initClock = setInterval( () => {
        document.getElementById("countdown").innerHTML = getHoursMinutes(myNow());
    }, 1000)
};

const sessionList = document.getElementById("sessionList");
Object.keys(schedule).forEach( (key) => {
    const el = document.createElement("a");
    el.classList.add("navbar-item");
    el.innerHTML = key;
    el.value = key;
    el.addEventListener("click", loadSession)
    sessionList.appendChild(el);
});
