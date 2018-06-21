var allUsers = {}
var seqId = 0
var rcvCallbacks = {}
var websocket

var DEFAULT_MESSAGES_LIMIT = 5

var tabs = ['messages', 'timeline']

function onUserConnect(userInfo) {
    var userId = userInfo.Id
    if (allUsers[userId]) {
        allUsers[userId].cnt++
    } else {
        allUsers[userId] = userInfo
        allUsers[userId].cnt = 1
    }
}

function onUserDisconnect(userInfo) {
    var userId = userInfo.Id
    if (allUsers[userId]) {
        allUsers[userId].cnt--
        if (allUsers[userId].cnt <= 0) {
            delete(allUsers[userId])
        }
    }
}

function onMessage(evt) {
    var reply = JSON.parse(evt.data)
    if (reply.Type == 'EVENT_ONLINE_USERS_LIST') {
        for (var i = 0; i < reply.Users.length; i++) {
            onUserConnect(reply.Users[i])
        }
    } else if (reply.Type == 'EVENT_USER_CONNECTED') {
        onUserConnect(reply)
    } else if (reply.Type == 'EVENT_USER_DISCONNECTED') {
        onUserDisconnect(reply)
    } else if (reply.Type == 'EVENT_NEW_MESSAGE') {
        onNewMessage(reply)
    } else {
        if (!rcvCallbacks[reply.SeqId]) {
            console.log("Received response for missing seqid")
            console.log(reply)
        } else {
            if (reply.Type == 'REPLY_ERROR') {
                console.log(reply.Message)
            } else {
                rcvCallbacks[reply.SeqId](reply)
            }

            delete(rcvCallbacks[reply.SeqId])
        }
    }

    redrawUsers()
}

function sendReq(reqType, reqData, onrcv) {
    websocket.send(JSON.stringify({
        SeqId: seqId,
        Type: reqType,
        ReqData: JSON.stringify(reqData),
    }))
    rcvCallbacks[seqId] = onrcv
    seqId++
}

function redrawUsers() {
    var str = '<b>online users</b>'
    var msgUsers = []

    for (var userId in allUsers) {
        var userInfo = allUsers[userId]
        if (userId == ourUserId) continue
        str += '<br/>' + userInfo.Name
        msgUsers.push('<div class="user" id="messages' + userInfo.Id + '">' + userInfo.Name + "</div>")
    }

    document.getElementById("online_users").innerHTML = str
    document.getElementById("users").innerHTML = msgUsers.join(" ")
    var els = document.getElementsByClassName("user")
    for (var i = 0; i < els.length; i++) {
        addEv(els[i].id, 'click', function(ev) {
            showMessages(ev.target.id.replace('messages', ''))
        })
    }
}

function setWebsocketConnection() {
    rcvCallbacks = {}
    websocket = new WebSocket("ws://" + window.location.host + "/events")
    websocket.onopen = function(evt) { console.log("open") }
    websocket.onclose = function(evt) { console.log("close"); setTimeout(setWebsocketConnection, 1000) }
    websocket.onmessage = onMessage
    websocket.onerror = function(evt) { console.log("Error: " + evt) }
}

function addEv(id, evName, func) {
    var el = document.getElementById(id)
    if (!el) {
        console.log("el not found: ", id)
        return false
    }
    el.addEventListener(
        evName,
        function (ev) {
            if (func(ev) === false) {
                ev.preventDefault()
                ev.stopPropagation()
            }
        },
        true
    )
    return true
}

function hideAll() {
    for (var i = 0; i < tabs.length; i++) {
        document.getElementById(tabs[i]).style.display = 'none'
    }
}

function showCurrent() {
    for (var i = 0; i < tabs.length; i++) {
        var tab = tabs[i]
        if (location.pathname.indexOf('/' + tab + '/') !== -1) {
            document.getElementById(tabs[i]).style.display = ''
            break
        }
    }
}

function changeLocation(title, url) {
    history.replaceState(null, title, url)
    hideAll()
    showCurrent()
}

function setUpPage() {
    hideAll()
    setUpMessagesPage()
    setUpTimelinePage()
    showCurrent()
}
