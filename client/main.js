import { Template } from 'meteor/templating';
import { ReactiveVar } from 'meteor/reactive-var';

import './router.js';
import '../imports/ui/nav.js';
import './main.html';
import '../imports/ui/home.html';
import '../imports/api/salesorders.js';
import '../imports/ui/schedule/schedule.js';
import '../imports/ui/salesOrders/viewer.js';
import '../imports/ui/salesOrders/index.js';
import '../imports/ui/purchaseOrders/index.js';

Template.hello.onCreated(function helloOnCreated() {
  // counter starts at 0
  this.counter = new ReactiveVar(0);
});

Template.hello.helpers({
  counter() {
    return Template.instance().counter.get();
  },
});

Template.hello.events({
  'click button'(event, instance) {
    // increment the counter when button is clicked
    let p = new Promise((resolve, reject) => {
      setTimeout(() => {
        resolve();
      }, 1500);
    });
    p.then(() => {
      instance.counter.set(instance.counter.get() + 1);
    });
  },
});
