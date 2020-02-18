import * as Caliper from 'ims-caliper';
import environment from "../environment";

export class CaliperService {
  private sensor : Caliper.Sensor;
  private session : Caliper.Session;
  private client : Caliper.HttpClient;
  private person : Caliper.Person;
  private application : Caliper.SoftwareApplication;
  
  constructor() {
    this.sensor = this.initializeSensor();
    this.client = this.initializeClient();
    this.application = this.initializeApplication();
    this.session = this.startSession();

    this.sensor.registerClient(this.client);
  }
  
  private initializeClient() {
    let client = Caliper.HttpClient;
    
    let options = {
      uri: environment.caliper.endpoint,
      json: true
    };

    client.initialize(this.sensor.getId().concat("/clients/1"), Object.assign(Caliper.HttpOptions, options));
    
    return client;
  }
  
  private initializeSensor() {
    let sensor = Caliper.Sensor;

    sensor.initialize(environment.caliper.appIRI.concat("/sensors/1"));

    return sensor;
  }
  
  /**
  * Initialise Caliper Session object
  */
  private startSession() {
    let sessionStart = new Date().toISOString();
    let sessionId = Caliper.Validator.generateUUID();
    
    let session = Caliper.EntityFactory().create(Caliper.Session, {
      id: environment.caliper.appIRI.concat(`/${sessionId}`),
      name: `session-${sessionId}`,
      dateCreated: sessionStart,
      startedAtTime: sessionStart
    });
    
    return session;
  }
  
  private createPerson(userId: string) {
    let person = Caliper.EntityFactory().create(Caliper.Person, {
      id: environment.caliper.appIRI.concat(`/users/${userId}`),
      name: userId
    });
  
    return person;
  }
  
  private initializePerson(userId: string) {
    this.person = this.createPerson(userId);
    this.session.user = this.person;
  }
  
  private initializeApplication() {
    let application = Caliper.EntityFactory().create(Caliper.SoftwareApplication, {
      id: environment.caliper.appIRI,
      type: Caliper.EntityType.softwareApplication.term,
      name: "Tutors"
    });
    
    console.log(application);
    
    return application;
  }
  
  /**
  * Record Log in to application event
  */  
  logStartSessionEvent(userId: string, courseUrl: string) {
    // attribute logged in user to current session object
    this.initializePerson(userId);
    
    let sessionEventId = Caliper.Validator.generateUUID();
    
    let event = Caliper.EventFactory().create(Caliper.SessionEvent, {
      id: sessionEventId,
      actor: this.person,
      action: Caliper.Actions.loggedIn.term,
      object: this.application,
      eventTime: new Date().toISOString(),
      target: courseUrl,
      edApp: environment.caliper.appIRI,
      session: this.session
    });
    
    this.sendEvent(event);
  }
  
  /**
  * Record Log out from application event
  */  
  logEndSessionEvent(userId: string, courseUrl: string) {
    let sessionEventId = Caliper.Validator.generateUUID();
    
    let event = Caliper.EventFactory().create(Caliper.SessionEvent, {
      id: sessionEventId,
      actor: this.person,
      action: Caliper.Actions.loggedOut.term,
      object: courseUrl,
      eventTime: new Date().toISOString(),
      target: courseUrl,
      edApp: this.application,
      session: this.session
    });
    
    this.sendEvent(event);
    this.session = null;
  }
  
  sendEvent(event: caliper.Event) {
    var data = [];
    data.push(event);
    
    let opts = {
      sensor: this.sensor.getId(),
      sendTime: new Date().toISOString(),
      dataVersion: "http://purl.imsglobal.org/ctx/caliper/v1p1",
      data: data
    };
    
    let envelope = this.sensor.createEnvelope(opts);
    this.sensor.sendToClient(this.client, envelope);
  } 
}