/**
 * Created by dn839u on 2/1/2016.
 */

var mongoose=require('mongoose');
var Schema=mongoose.Schema;

var movieSchema=new Schema({
    title:String,
    releaseYear:'String',
    director:'String',
    genre:'String'
});

module.exports=mongoose.model('Movie',movieSchema);