# Jcall.js
Better results requires a beatifull seamless code design that both helps ease the workflow, and keep it organized. Jcalls offers all of that beside a plenty of other functionalities and features hidden midway ;).

yeap that's me! [@yousef_neji](https://github.com/yousef312)

## How to?
Importing..

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

// by default POST
jcall("/user/add")
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

### Using Different Methods
```javascript
jcall("GET:match/score") // get request
jcall("PATCH:match/data") // patch request
jcall("DELETE:user/record") // delete request
jcall("PUT:user/login") // update request
...
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
// the `after` or `before` functions will sequencly execute
// after and before each request, can be used to dynamically 
// update the authorization token each time it get updated 
// server-side!
jcall.after = (res)=>{
    if(res.result.token)
        // the authorization attribute get 
        // send automatically in the headers 
        // with each request
        jcall.authorization = "Bearer " + res.result.token;
}

jcall.before = (request,data)=>{
    // do something to the data & the request
    let test = validate(data); // validation for example
    if(!test) return false; // will silently skip/stop the request returning `false` in .then() callback

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
