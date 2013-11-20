![logo](site/logo_text.png)

# HackTX 2013

Disclaimer: This project was created during a 24 hour hackathon called HackTX. We as a team won the "Hacker Lounge" prize! http://techzette.com/2013-hacktx-winners-and-finalists/


#Brief Installation Instructions
* Make sure you have node and postgres installed
* add a new postgres db called hacktx with a user called adamf (or change the configs in the backend files)
* cd site/
* npm install
* node install_tables.js (when you see Done, ^C)
* node backend.js (starts the backend api server running on port 3000)
* in a new window...
* cd peerjs-server
* npm install
* node bin/peerjs --port 8080

After that you should be able to hit localhost:3000 and see it running.
When you hit "Dwop", the url will change to have a room number in it, this is what you send to others to download the file from.
