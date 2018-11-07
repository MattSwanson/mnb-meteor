import { Meteor } from 'meteor/meteor';
import { Mongo } from 'meteor/mongo';
import { Template } from 'meteor/templating';

import './partEntry.html';
import { Items, Materials, Coatings, SecondaryProcesses } from '../../api/items';
import { EventEmitter } from 'events';

FlowRouter.route('/partEntry', {
  name: 'partEntry',
  action(){
    BlazeLayout.render('partEntry');
  }
});

Template.partEntry.onCreated(function(){
  Meteor.subscribe('materials');
  Meteor.subscribe('coatings');
  Meteor.subscribe('secondaryProcesses');
});

Template.partEntry.helpers({
  materials(){
    return Materials.find({}, { sort: { name: 1 }});
  },
  coatings(){
    return Coatings.find({}, { sort: { name: 1 }});
  },
  secondaryProcesses(){
    return SecondaryProcesses.find({}, { sort: { name: 1 }});
  }
});

Template.partEntry.events({
  'submit form': function(event){
    event.preventDefault();
    if(event.target.checkValidity() === false){
      console.log('No valid');
      event.stopPropagation();
      event.target.classList.add('was-validated');
      return;
    }
    const simpleDescription = `${event.target.size.value} ${event.target.description.value}`;
    const material = Materials.findOne({ _id: new Mongo.ObjectID(event.target.material.value)}).name;
    var coating;
    if(event.target.coating.value != 0){
      coating = Coatings.findOne({ _id: new Mongo.ObjectID(event.target.coating.value)}).name;
    }
    var addlProcess;
    if(event.target.addlProcess.value != 0){
      addlProcess = SecondaryProcesses.findOne({ _id: new Mongo.ObjectID(event.target.addlProcess.value)}).name;
    }
    let effDate = new Date(event.target.effectiveDate.value);
    if(isNaN(effDate.getMilliseconds())){ //Invalid Date
      alert("Date is not valid");
      return;
    }
    const item = {
      number: event.target.partNumber.value,
      revision: event.target.revision.value,
      simpleDescription: simpleDescription,
      effectiveDate: effDate,
      cost: event.target.cost.value,
      salePrice: event.target.salePrice.value,
      isActive: true,
      part: {
        description: event.target.description.value,
        size: event.target.size.value,
        origin: event.target.origin.value,
        material: material,
        coating: coating,
        additionalProcess: addlProcess
      },
      location: {
        shelfId: 'A1',
        shelfNum: 1
      }
    };
    Meteor.call('item.createPart', item, (err, res) => {
      if(err){
        if(err.error === "item-revision-exists")
          alert('That item revision already exists');
        else
          alert(err.message);
        return;
      }else{
        FlowRouter.go(`/items/${res._str}`);
      }
    });
  },
  'click .new-material-btn': function(event){
    $('.new-material-dlg').modal('show');
  },
  'click .new-material-dlg .save-btn': function(event, template){
    let name = $('.new-material-dlg #new-name').val();
    if(name.trim() == ''){
      alert("Can not enter a blank name");
      return;
    }
    Meteor.call('item.newMaterial', { name: name }, (err, res)=>{
      if(err)
        alert(err);
      else{
        $('.new-material-dlg').modal('hide');
        $('.new-material-dlg input#new-name').val('');
      }
    });
  },
  'click .new-coating-btn': function(event){
    $('.new-coating-dlg').modal('show');
  },
  'click .new-coating-dlg .save-btn': function(event){
    let name = $('.new-coating-dlg #new-name').val();
    if(name.trim() == ''){
      alert("Can not enter a blank name");
      return;
    }
    Meteor.call('item.newCoating', { name: name }, (err, res)=>{
      if(err)
        alert(err);
      else{
        $('.new-coating-dlg').modal('hide');
        $('.new-coating-dlg input#new-name').val('');
      }
    });
  },
  'click .new-process-btn': function(event){
    $('.new-process-dlg').modal('show');
  },
  'click .new-process-dlg .save-btn': function(event){
    let name = $('.new-process-dlg #new-name').val();
    if(name.trim() == ''){
      alert("Can not enter a blank name");
      return;
    }
    Meteor.call('item.newProcess', { name: name }, (err, res)=>{
      if(err)
        alert(err);
      else{
        $('.new-process-dlg').modal('hide');
        $('.new-process-dlg input#new-name').val('');
      }
    });
  }
});