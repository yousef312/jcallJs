# Jcall.js
Ajax library that ease sending asynchronous calls to your backend server

## Author 
Yousef Neji

## Version
1.0.0


## Tutorial
Starting by importing our library

```JavaScript
// commonjs
var jcall = require('jcall');

// ESM
import Jcall from "jcall";
```

A simple example to send a simple request to create a user
```JavaScript
let data = {
    username: "your_name",
    password: "Es4e5_*Es**45",
    email: "your_name22@gmail.com",
    age: 23
}

jcall("/user/add",{
    method: "POST"
})
    .launch(data)
    .then((res)=>{
        // structure of `res`
        // res = {
        // result : (data-sent-back-parsed),
        // response: (pure-response-object from either xmlHttpRequest or fetch)
        // headers: (Headers sent back with the request)
        // contentType: self-explainatory
        // }

        // supposing in nodejs: res.json({ success: true, action: "user-added", user})
        if(res.result.success){ 
            displayUser(res.result.user);
        }
    })
    .catch(e=>{
        console.error(e);
    })

```

### Manipulating headers
```JavaScript
jcall("match/end")
// setting some headers
.setHeaders({
    accept: "application/json", // "application/xml" "text/html" ...
    cache: true,
    cookie: "some-cookies", 
    lang: "en",
    // ....
}).launch ...

```

### CSRF(Cross-Site Request Forgery tokens)
For handling csrf tokenization the library offers an attribute `csrf` that ease defending this attack!
```JavaScript
// on top of your scripte
var csrfToken = eye("meta[name='csrf-token']").attr("content");
jcall.csrf = csrfToken;
// from now on, will be send automatically with each request!
```

### Authorization/login token
when authorizing a user, the usual flow consist of getting unique token from the backend and send it with each future call, so the server verify it's you!
```JavaScript
// the `after` func will get executed
// after each request, can be used to
// dynamically update the authorization 
// token each time it get updated 
// server-side!
jcall.after = (res)=>{
    if(res.result.token)
        // the authorization attribute get 
        // send automatically in the headers 
        // with each request
        jcall.authorization = "Bearer " + res.result.token;
}

// future request is authorized and well maintained
```
### Preventer
the library offers a very good functionality called the preventer.
it display a div element that prevent user from interacting with the window while
a request is being sent!
```javascript

// minimum preventer setup
// must have two functions `open` and `close` 
let untouchable = eye(".untouchable");
untouchable.open = function(){
    this.style.display = "inline-block";
}
untouchable.close = function(){
    this.style.display = "none";
}

jcall.preventer = untouchable;

// similarly you can just pass true
// and the library will auto create
// and use the preventer internally 
jcall.preventer = true;

```

## Copyrights
Reserved under MIT license
