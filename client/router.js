BlazeLayout.setRoot('body');

FlowRouter.route('/', {
  name: 'home',
  action(){
    BlazeLayout.render('MainContent', {main: 'home'});
  }
});

FlowRouter.route('/schedule', {
  name: 'schedule',
  action(){
    BlazeLayout.render('MainContent', {main: 'schedule'} );
  }
});

FlowRouter.route('/salesOrders/:id', {
  name: 'salesOrder',
  action(){
    BlazeLayout.render('soViewer');
  }
});