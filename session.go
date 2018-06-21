package main

import (
	"github.com/bradfitz/gomemcache/memcache"
	"math/rand"
	"time"
	"encoding/json"
	"fmt"
)

var mc = memcache.New("127.0.0.1:11211")

func initSession() {
	rand.Seed(time.Now().UnixNano())
}

func getSessionInfo(id string) (result map[string]string, err error) {
	var item *memcache.Item
	item, err = mc.Get("session_" + id)
	if err != nil {
		return
	}

	contents := item.Value

	result = make(map[string]string)
	err = json.Unmarshal(contents, &result)
	if err != nil {
		return
	}
	return
}

func createSession(info map[string]string) (id string, err error) {
	var contents []byte
	contents, err = json.Marshal(info)
	if err != nil {
		return
	}

	id = fmt.Sprint(rand.Int63())
	err = mc.Set(&memcache.Item{Key: "session_" + id, Value: contents})
	if err != nil {
		id = ""
		return
	}
	return
}
