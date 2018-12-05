AccountsTemplates.configure({
  defaultLayoutType: 'blaze',
  defaultLayout: 'MainContent',
  defaultLayoutRegions: {
    nav: 'nav'
  },
  defaultContentRegion: 'main',
  //forbidClientAccountCreation: true
  showForgotPasswordLink: true
});

AccountsTemplates.configureRoute('signIn', {
  name: 'signin',
  path: '/signin'
});

AccountsTemplates.configureRoute('signUp', {
  name: 'join',
  path: '/join'
});

AccountsTemplates.configureRoute('forgotPwd');

AccountsTemplates.configureRoute('resetPwd', {
  name: 'resetPwd',
  path: '/reset-password'
});