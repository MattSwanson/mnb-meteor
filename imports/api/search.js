import { Meteor } from 'meteor/meteor';
import { Mongo } from 'meteor/mongo';

export const SearchIndex = new Mongo.Collection('searchindex');

if(Meteor.isServer){
  Meteor.publish('searchIndex', function(){
    console.log("Publishing search index");
    return SearchIndex.find({}, {sort: { name: 1}});
  });
}