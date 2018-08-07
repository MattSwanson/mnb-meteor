import { Meteor } from 'meteor/meteor';
import { Mongo } from 'meteor/mongo';
import { Template } from 'meteor/templating';

import './viewer.html';
import './partViewer.html';
import './kitViewer.html';
import { Items } from '../../api/items';

FlowRouter.route('/items/:id', {
  name: 'item',
  action(){
    BlazeLayout.render('itemViewer');
  }
});

Template.itemViewer.onCreated(function(){
  this.autorun(function(){
    FlowRouter.watchPathChange();
    let id = FlowRouter.getParam('id');
    Meteor.subscribe('singleItem', id);
  })
});

Template.itemViewer.helpers({
  item(){
    const id = FlowRouter.getParam('id');
    const itemId = new Mongo.ObjectID(id);
    return Items.findOne(itemId);
  }
})