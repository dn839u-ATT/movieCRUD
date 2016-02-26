/**
 * Created by dn839u on 2/1/2016.
 */
// Load Our Modules

var express = require('express');
var bodyParser = require('body-parser');
var mongoose = require('mongoose');
var multer = require('multer');

//starting the socket io server
var app = express();
var server = require('http').createServer(app);
var io = require('socket.io')(server);
var ffmpeg = require('fluent-ffmpeg');
var fs = require('fs');
var exec = require('child_process').exec;
var util = require('util');
var Files = {};

//CORS 
var allowCrossDomain = function(req, res, next) {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE');
    res.header('Access-Control-Allow-Headers', 'Content-Type');
    next();
}

//multer for disk storage
var storage = multer.diskStorage({ //multers disk storage settings
	destination: function (req, file, cb) {
		cb(null, './uploads/')
	},
	filename: function (req, file, cb) {
		var datetimestamp = Date.now();
		cb(null, file.fieldname + '-' + datetimestamp + '.' + file.originalname.split('.')[file.originalname.split('.').length -1])
	}
 });
 
  var upload = multer({ //multer settings
      storage: storage
 }).single('file');

/** API path that will upload the files */
app.post('/upload', function(req, res) {
	upload(req,res,function(err){
		if(err){
			 res.json({error_code:1,err_desc:err});
			 return;
		}
		 res.json({error_code:0,err_desc:null});
	})
   
});

//modeling the database
var mongoose=require('mongoose');
var Schema=mongoose.Schema;

var movieSchema=new Schema({
    title:String,
    releaseYear:'String',
    director:'String',
    genre:'String',
	path:'String'
});

var Movie=mongoose.model('Movie',movieSchema);

//configure routes for CRUD operations.
var router=express.Router();

router.route('/movies')
    .get(function(req,res){
	   console.log('Showing all the movies');
	   var movieIdParam = req.param('movieId');
	   var movieTitleParam = req.param('title');
	   if(typeof(movieIdParam) !== 'undefined') {
			console.log(movieIdParam);
			 Movie.find({_id:movieIdParam},function(err, movies) { // We can even try to think of providing just the search by Id.
				if(err)
					res.send(err);

				res.json(movies);
			});
	   } else if(typeof(movieTitleParam) !== 'undefined') {
			console.log(movieTitleParam);
			 Movie.find({title:movieTitleParam},function(err, movies) {
				if(err)
					res.send(err);

				res.json(movies);
			});
	   } else {
			Movie.find(function(err,movies){
			   if(err)
					res.send(err);
			   res.json(movies);
		   });
	   }
    })

    .post(function(req,res){
        var movie=new Movie(req.body);
        movie.save(function(err){
            if(err)
                res.send(err);
            res.send({message:'Movie Added'});
        });
    });


router.route('/movies/:id')
    .put(function(req,res){
        console.log(req.params.id);
        Movie.findOne({_id:req.params.id},function(err,movie){

            if(err)
                res.send(err);

           for(prop in req.body){
                movie[prop]=req.body[prop];
           }

            // save the movie
            movie.save(function(err) {
                if (err)
                    res.send(err);

                res.json({ message: 'Movie updated!' });
            });

        });
    })

    .get(function(req,res){
        Movie.findOne({_id:req.params.id},function(err, movie) {
            if(err)
                res.send(err);

            res.json(movie);
        });
    })

    .delete(function(req,res){
        Movie.remove({
            _id: req.params.id
        }, function(err, movie) {
            if (err)
                res.send(err);

            res.json({ message: 'Successfully deleted' });
        });
    });
	
module.exports=router;

//connect to our database
//Ideally you will obtain DB details from a config file

var dbName='movieDB';

var connectionString='mongodb://127.0.0.1:27017/'+dbName;

mongoose.connect(connectionString);
app.use(allowCrossDomain);
app.use(bodyParser.json());
//app.use(bodyParser.urlencoded());
app.use(bodyParser.urlencoded({ extended: true }));

app.use('/api', router);

module.exports = app;

//socket io layer to write the uploaded file to the file system
io.sockets.on('connection', function (socket) {
  	socket.on('Start', function (data) { //data contains the variables that we passed through in the html file
			var Name = data['Name'];
			Files[Name] = {  //Create a new Entry in The Files Variable
				FileSize : data['Size'],
				Data	 : "",
				Downloaded : 0
			}
			var Place = 0;
			try{
				var Stat = fs.statSync('Temp/' +  Name);
				if(Stat.isFile())
				{
					Files[Name]['Downloaded'] = Stat.size;
					Place = Stat.size / 524288;
				}
			}
	  		catch(er){} //It's a New File
			fs.open("Temp/" + Name, 'a', 0755, function(err, fd){
				if(err)
				{
					console.log(err);
				}
				else
				{
					Files[Name]['Handler'] = fd; //We store the file handler so we can write to it later
					socket.emit('MoreData', { 'Place' : Place, Percent : 0 });
				}
			});
	});
	
	socket.on('Upload', function (data){
			var Name = data['Name'];
			Files[Name]['Downloaded'] += data['Data'].length;
			Files[Name]['Data'] += data['Data'];
			if(Files[Name]['Downloaded'] == Files[Name]['FileSize']) //If File is Fully Uploaded
			{
				fs.write(Files[Name]['Handler'], Files[Name]['Data'], null, 'Binary', function(err, Writen){
					var inputFileName = "Temp/" + Name;
					var outputFileName = "Video/" + Name;
					var input = fs.createReadStream("Temp/" + Name);
					var output = fs.createWriteStream("Video/" + Name);
					
					/*util.pump(input, output, function(){
						fs.unlink("Temp/" + Name, function () { //This Deletes The Temporary File
							exec("ffmpeg -i Video/" + Name  + " -ss 01:30 -r 1 -an -vframes 1 -f mjpeg Video/" + Name  + ".jpg", function(err){
								socket.emit('Done', {'Image' : 'Video/' + Name + '.jpg'});
							});
						});
					});*/
		
					//var proc = new ffmpeg(input)
					
					//var outStream = fs.createWriteStream('/path/to/output.mp4');

					ffmpeg(inputFileName)
					  .format('mp4')
					  .videoCodec('libx264')
					  .audioCodec('libmp3lame')
					  .on('error', function(err) {
						console.log('An error occurred: ' + err.message);
					  })
					  .on('end', function() {
						console.log('Processing finished !');
						socket.emit('Done', {'Image' : 'Video/' + Name + '.jpg'});
					  })
					  .save(outputFileName);
					  socket.emit('echo', 'file has been converted succesfully <br />');
					/*input.pipe(output);
					input.on("end", function() {
						console.log("end");
						fs.unlink("Temp/" + Name, function ()
						{ //This Deletes The Temporary File
							console.log("unlink this file:",Name );
							socket.emit('Done', {'Image' : 'Video/' + Name + '.jpg'});
						});
					});*/
				});
			}
			else if(Files[Name]['Data'].length > 10485760){ //If the Data Buffer reaches 10MB
				fs.write(Files[Name]['Handler'], Files[Name]['Data'], null, 'Binary', function(err, Writen){
					Files[Name]['Data'] = ""; //Reset The Buffer
					var Place = Files[Name]['Downloaded'] / 524288;
					var Percent = (Files[Name]['Downloaded'] / Files[Name]['FileSize']) * 100;
					socket.emit('MoreData', { 'Place' : Place, 'Percent' :  Percent});
				});
			}
			else
			{
				var Place = Files[Name]['Downloaded'] / 524288;
				var Percent = (Files[Name]['Downloaded'] / Files[Name]['FileSize']) * 100;
				socket.emit('MoreData', { 'Place' : Place, 'Percent' :  Percent});
			}
		});
});

//code to stream the video files
app.get('/Video/:filename', function(req, res) {
  var path = 'Video/' + req.params.filename;
  var stat = fs.statSync(path);
  var total = stat.size;
  if (req.headers['range']) {
    var range = req.headers.range;
    var parts = range.replace(/bytes=/, "").split("-");
    var partialstart = parts[0];
    var partialend = parts[1];

    var start = parseInt(partialstart, 10);
    var end = partialend ? parseInt(partialend, 10) : total-1;
    var chunksize = (end-start)+1;
    console.log('RANGE: ' + start + ' - ' + end + ' = ' + chunksize);

    var file = fs.createReadStream(path, {start: start, end: end});
    res.writeHead(206, { 'Content-Range': 'bytes ' + start + '-' + end + '/' + total, 'Accept-Ranges': 'bytes', 'Content-Length': chunksize, 'Content-Type': 'video/mp4' });
    file.pipe(res);
  } else {
    console.log('ALL: ' + total);
    res.writeHead(200, { 'Content-Length': total, 'Content-Type': 'video/mp4' });
    fs.createReadStream(path).pipe(res);
  }
});

//code to start the server
var port = process.env.PORT || 3000; // set the port
server.listen(port);
console.log("App listening on port " + port);

