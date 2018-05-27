# Mobile Web Specialist Certification Course
---
#### Restaurant Reviews

## Overview: Client side

**Stage One** :  Take a static design that lacks accessibility and convert the design to be responsive on different sized displays and accessible for screen reader use.  Adding, too, a service worker.

**Stage Two** :  Get information from server and cache that data with IndexedDB.  Audit the client side from Lighthouse and get a score of **Performance > 70** , **PWA > 90** and **Accessibility > 90**

**Stage Three** : Add form to create new reviews.  Add button to add a restaurant to favorite.  Offline use: The client application works offline.  Audit the client side from Lighthouse and get a score of **Performance > 90** , **PWA > 90** and **Accessibility > 90**

## How to start

### Execute on development mode

```shell
npm install
gulp clean
gulp
```

### Execute Server Client

In this folder, start up a simple HTTP server to serve up the site files on your local computer. Python has some simple tools to do this, and you don't even need to know Python. For most people, it's already installed on your computer.

In a terminal, check the version of Python you have: `python -V`. If you have Python 2.x, spin up the server with `python -m SimpleHTTPServer 8000` (or some other port, if port 8000 is already in use.) For Python 3.x, you can use `python3 -m http.server 8000`. If you don't have Python installed, navigate to Python's [website](https://www.python.org/) to download and install the software.
