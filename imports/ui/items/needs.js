import { Meteor } from 'meteor/meteor';
import { Mongo } from 'meteor/mongo';
import { Template } from 'meteor/templating';

import './needs.html';
import { Items } from '../../api/items';

var ItemNeeds = new Mongo.Collection('itemNeeds');

FlowRouter.route('/itemNeeds', {
  name: 'itemNeeds',
  action(){
    BlazeLayout.render('itemNeeds');
  }
});

Template.itemNeeds.onCreated(function(){
  this.autorun(function(){
    //FlowRouter.watchPathChange();
    //let id = FlowRouter.getParam('id');
    //Meteor.subscribe('singleItem', id);
    //Meteor.subscribe('itemAliases', id);
    Meteor.subscribe('itemNeeds');
  })
});

Template.itemNeeds.helpers({
  needs(){
    const arr = Items.find({ needs: { $exists: true, $ne: [] }}, { fields: { _id: 1, number: 1, needs: 1 }}).fetch();
    // Each item could have multiple need lines so we need to reduce this make them separate rows since the dates will likely be different
    var flat = arr.reduce((acc, val) => {
      val.needs.forEach((line)=>{
        line.number = val.number;
        line.revision = val.revision;
        line.itemId = val._id;
      });
      return [...acc, ...val.needs];
    }, []);
    flat.sort((a,b)=>{
      return a.needDate - b.needDate;
    })
    return flat;
  }
})