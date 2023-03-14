import './schedule.json.js';

function startingBefore(talkA, talkB) {
    return talkA.start < talkB.start;
}

function myNow() {
    return new Date(Date.now());
}

function getHoursMinutes(date, padding=2, seperator=":") {
    return String(date.getHours()).padStart(padding, '0') + seperator + String(date.getMinutes()).padStart(padding, '0')
}

function setClock(now) {
    document.getElementById("countdown").innerHTML = getHoursMinutes(now);
}

function setCountdown(remaining) {
    const minutes = String(Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60)));
    const seconds = String(Math.floor((remaining % (1000 * 60)) / 1000));

    document.getElementById("countdown").innerHTML = minutes.padStart(2, '0') + ":" + seconds.padStart(2, '0');
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
        // console.log(this);
        if(!this.showclock) {
            this.update(remaining);
        }
        else {
            setClock(now);
        }
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

    prepare() {
        throw new Error("Implement prepare function");
    }

    update(remaining) {
        throw new Error("Implement update function");
    }

    cleanup() {
        throw new Error("Implement cleanup function");
    }
}

function makeTalk(json, globalJson) {
    let content = 1000;
    let questions = 1000;
    let gracetime = 1000;
    if(json.lengths) {
        content = json.lengths.content * content;
        questions = json.lengths.questions * questions;
        gracetime = json.lengths.gracetime * gracetime;
    }
    else {
        content = globalJson.content * content;
        questions = globalJson.questions * questions;
        gracetime = globalJson.gracetime * gracetime;
    }

    const speaker = json.speaker;
    const start = new Date(json.start);
    const showclock = json.showclock;
    
    const talk = new Talk(speaker, start, content, questions, gracetime, globalJson.warnspeaker * 1000, showclock);
    console.log(talk);
    return talk;
}

class Talk extends Timer {
    static SEG_CONTENT = 0;
    static SEG_QUESTIONS = 1;
    static SEG_GRACETIME = 2;

    constructor(speaker, start, content, questions, gracetime, warnspeaker, showclock) {
        const end = new Date(start.getTime() + (content + questions + gracetime));
        super(start, end, showclock);
        this.speaker = speaker;
        this.content = content;
        this.questions = questions;
        this.gracetime = gracetime;
        this.warnspeaker = warnspeaker;
        this.speakerwarned = false;
        this.talkSegment = 0;
    }
    
    remaining(now) {
        const toEnd = super.remaining(now);
        this._updateTalkSegment(toEnd);
        if(this.talkSegment === Talk.SEG_CONTENT) // In content
            return toEnd - (this.questions + this.gracetime);
        else if(this.talkSegment === Talk.SEG_QUESTIONS) // In questions
            return toEnd - this.gracetime;
        else
            return toEnd;
    }

    description() {
        return this.speaker;
    }

    _updateTalkSegment(remainingToEnd) {
        if(remainingToEnd > this.questions + this.gracetime)
            this.talkSegment = Talk.SEG_CONTENT;
        else if(remainingToEnd > this.gracetime) {
            this.talkSegment = Talk.SEG_QUESTIONS;
            if(this.speakerwarned)
                this._clearWarning()
        }
        else
            this.talkSegment = Talk.SEG_GRACETIME;
    }

    _clearWarning() {
        document.getElementById("countdown").classList.remove("has-text-warning");
        this.speakerwarned = false;
    }

    prepare() {
        document.getElementById("currentSpeaker").innerHTML = "Currently: " + this.description();
        document.getElementById("upsesy").classList.add("is-talk");
        this.talksegment = this.SEG_CONTENT;
    }

    update(remaining) {
        setCountdown(remaining);
        if(!this.speakerwarned && this.talkSegment == Talk.SEG_CONTENT && remaining < this.warnspeaker) {
            console.log("WARNING");
            document.getElementById("countdown").classList.add("has-text-warning");
            this.speakerwarned = true;
        }
    }

    cleanup() {
        document.getElementById("upsesy").classList.remove("is-talk");
        this._clearWarning();
    }
}

function makePause(json, globalJson) {
    const length = (json.lengths ? json.lengths.content : globalJson.content) * 1000;
    const desc = json.speaker;
    const start = new Date(json.start);
    const end = new Date(start.getTime() + length);
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

    description() {
        return this.desc;
    }

    prepare() {
        document.getElementById("currentSpeaker").innerHTML = "Currently: " + this.description();
        document.getElementById("upsesy").classList.add("is-pause");
    }

    update(remaining) {
    }

    cleanup() {
        document.getElementById("upsesy").classList.remove("is-pause");
    }
}

class EndOfSession extends Timer {
    constructor(start) {
        super(start, null, true);
    }

    description() {
        return "Session has ended";
    }

    prepare() {
        document.getElementById("currentSpeaker").innerHTML = this.description();
        document.getElementById("upsesy").classList.add("is-pause");
    }    

    update(remaining) {
    }

    cleanup() {
        document.getElementById("upsesy").classList.remove("is-pause");
    }
}

class Session {
    constructor(sessionJson, globalJson, now) {
        this.upcoming = Array();
        this.past = Array();

        sessionJson.thetalks.forEach( (talk) => {
            let thetalk = null;
            if(talk.kind == "regular") {
                thetalk = makeTalk(talk, globalJson);
            }
            else if(talk.kind == "pause") {
                thetalk = makePause(talk, globalJson);
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
        if(this.current)
            this.current.cleanup();

        this._updateCurrentTalk();
        this._displayNext();
        this.current.prepare();
        console.log("Next running ", this.current);
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
            document.getElementById("nextSpeaker").classList.add("has-text-info");
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
    const session = new Session(schedule["sessions"][sessionName], schedule["global"], myNow());
    session.runSession();
}

window.onload = function() {
    setClock(myNow());
    var initClock = setInterval( () => {
        setClock(myNow());
    }, 1000)

    const sessionList = document.getElementById("sessionList");
    schedule = JSON.parse(schedule);
    Object.keys(schedule["sessions"]).forEach( (key) => {
        const el = document.createElement("a");
        el.classList.add("navbar-item");
        el.innerHTML = key;
        el.value = key;
        el.addEventListener("click", loadSession)
        sessionList.appendChild(el);
    });
}