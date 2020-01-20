const util = require("util");
const { JSDOM } = require("jsdom");
const { ChatManager, TokenProvider } = require("@pusher/chatkit-client");
const axios = require("axios");
const prompt = require("prompt");
const ora = require("ora");
const readline = require("readline");
const chatkit = require('@pusher/chatkit-server')
const spinner = ora();
const get = util.promisify(prompt.get)        

const prompt_attributes = [
    {
        name: 'username',
        validator: /^[a-zA-Z\s\-]+$/,
        warning: 'Username is not valid, it can only contains letters, spaces, or dashes'
    }
];

const makeChatkitNodeCompatible = () => {
    const { window } = new JSDOM()
    global.window = window
    global.navigator = {}
  };
makeChatkitNodeCompatible();

const authenticate = async (username) => {
    try {
     return await axios.post("http://register.ecellmnnit.in:3001/checkuser", { username});
    } catch ({ message }) {
      throw new Error(`Failed to authenticate, ${message}`);
    }
}; 


const createUser = async (username) => {
    try {
        await axios.post('http://register.ecellmnnit.in:3001/users', {
            username
        })
    } catch (error) {
        console.log(error);
    }
}

var main = async () =>{
    prompt.start();
    prompt.message = '';
    const {username } = await get (prompt_attributes);
    spinner.start("Authenticating..");
    await authenticate(username);
    spinner.succeed(`Authenticated as ${username}`); 
    await createUser(username);

    const chatManager = new ChatManager({
        instanceLocator: 'v1:us1:34da0fdb-580d-4e02-b380-20a6311a9bc4',
        userId: username,
        tokenProvider : new TokenProvider({
            url: 'http://register.ecellmnnit.in:3001/authenticate'
        })
    })

        spinner.start('-------------------Wait-----------------')
        const currentUser = await chatManager.connect();
        spinner.succeed('-------------------Done-----------------')
        ConnectToRooms(currentUser);    
        
}


const ConnectToRooms = async (currentUser) => {
        
    spinner.start("Fetching Rooms..");
    
    const joinableRooms = await currentUser.getJoinableRooms();
    const availableRooms = [...currentUser.rooms,...joinableRooms];
    
    spinner.succeed(`Rooms Fetched..`);
    availableRooms.forEach((room,index)=>{
        console.log(`${index} - ${room.name}`);
    });
    console.log(`${availableRooms.length} - Create New Room`);
    
     
    const roomSchema = [
        {
            description: 'Enter Select a room',
            name: 'chosenRoom',
            required: true
        }
    ]
    var { chosenRoom } = await get(roomSchema);
    
    while (chosenRoom>availableRooms.length) {
     
        spinner.start("Fetching Rooms..");
        
        const joinableRooms = await currentUser.getJoinableRooms();
        const availableRooms = [...currentUser.rooms,...joinableRooms];
        
        spinner.succeed(`Rooms Fetched..`);
        availableRooms.forEach((room,index)=>{
            console.log(`${index} - ${room.name}`);
        });
        console.log(`${availableRooms.length} - Create New Room`);
        const roomSchema = [
            {
                description: 'Enter Select a room',
                name: 'choice',
                required: true
            }
        ]       
        const  { choice } = await get(roomSchema);
        chosenRoom = choice;
    }
    if(chosenRoom === availableRooms.length.toString())
    {   
        const newroomSchema = [
            {
                name: 'newRoom',
                required: true
            }
        ]

        const { newRoom } = await get(newroomSchema);
          await currentUser.createRoom({
            id: chosenRoom,
            name: newRoom,
            private: false,
            addUserIds: [],
          }).then(room => {
            console.log(`Created room called ${room.name}`)
            ConnectToRooms(currentUser);
          })
          .catch(err => {
            console.log(`Error creating room ${err}`)
          })
    }
    const room = availableRooms[chosenRoom] ;
    if(chosenRoom<availableRooms.length)
     {   spinner.start("Connecting ..");
        await currentUser.subscribeToRoomMultipart({
            roomId: room.id,
            hooks: {
                onMessage: message => {
                    const { sender, parts } = message
                    if (sender.id === currentUser.name) {
                        return
                    }
                    console.log(`${sender.id}: ${parts[0].payload.content}`)
                }
            },
            messageLimit:0
        });
        
        const input = readline.createInterface({ 
            input: process.stdin
        })
        
        input.on('line',async text =>{
            if(text !== 'exit')
            await currentUser.sendMessage({
                roomId:room.id,
                text
            });
            else{
                input.close();
                await ConnectToRooms(currentUser);
            }
        });
        spinner.succeed(`Connected..`);
    }
} 
main();