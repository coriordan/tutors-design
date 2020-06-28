export default {
  debug: true,
  testing: true,
  pushState: true,
  urlPrefix: "",
  search: 80,
  auth0: {
    clientId: 'GaRinBEbq5RiS2hwsKe4Tr96vQ4gmHAv',
    domain: 'dev-ag-6r7t5.eu.auth0.com',
    redirectUri: 'http://localhost:8081/authorize'
  },
  firebase: {
    apiKey: "AIzaSyAzoLn7SfXkH58oBRq4dFjLW6DgIpdUf9w",
    databaseURL: "https://tutors-177ed.firebaseio.com",
    projectId: "tutors-177ed"
  },
  caliper: {
    appIRI: "http://example.edu/tutors",
    endpoint: "https://5wc5v6uskf.execute-api.eu-west-1.amazonaws.com/develop/store-caliper-event"
  },
  ga : "UA-147419187-2"
};