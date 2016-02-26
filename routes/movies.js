/**
 * Created by dn839u on 2/1/2016.
 */

var Movie=require('../models/movie');
var express=require('express');


//configure routes

var router=express.Router();

router.route('/movies')
    .get(function(req,res){
       Movie.find(function(err,movies){
           if(err)
                res.send(err);
           res.json(movies);
       });
    })

    .post(function(req,res){
        var movie=new Movie(req.body);
        movie.save(function(err){
            if(err)
                res.send(err);
            res.send({message:'Movie Added'});
        });
    });


router.route('/movies/?movieId=:id')
    .put(function(req,res){
        //consoleTwo.log(req.params.id);
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
    var movieIdParam = req.params.get('movieId');
    //console.log(movieId);
        Movie.findOne({_id:movieIdParam},function(err, movie) {
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
	
	router.route('/movies/:title')
    .get(function(req,res){
        Movie.findOne({title:req.params.title},function(err, movie) {
            if(err)
                res.send(err);

            res.json(movie);
        });
    }) 


module.exports=router;