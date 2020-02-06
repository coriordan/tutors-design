import * as Caliper from 'ims-caliper';
import environment from "../environment";

export class CaliperService {
  private sensor : Caliper.Sensor;
  private session : Caliper.Session;
  private client : Caliper.HttpClient;
  // private person : caliper.Person;
  // private application : caliper.SoftwareApplication;
  
  constructor() {
    this.sensor = this.initializeSensor();
    this.client = this.initializeClient();
    this.session = this.startSession();
    
    this.sensor.registerClient(client);
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
    
  logStartSessionEvent(userId: string, courseUrl: string) {
    // attribute logged in user to current session object
    this.session.user = userId;
    let sessionEventId = Caliper.Validator.generateUUID();
    
    let event = Caliper.EventFactory().create(Caliper.SessionEvent, {
      id: sessionEventId,
      actor: userId,
      action: Caliper.Actions.loggedIn.term,
      object: environment.caliper.appIRI,
      eventTime: new Date().toISOString(),
      target: courseUrl,
      edApp: environment.caliper.appIRI,
      session: this.session
    });
    
    this.sendEvent(event);
  }
  
  logEndSessionEvent(userId: string, courseUrl: string) {
    // attribute logged in user to current session object
    this.session.user = userId;
    let sessionEventId = Caliper.Validator.generateUUID();
    
    let event = Caliper.EventFactory().create(Caliper.SessionEvent, {
      id: sessionEventId,
      actor: userId,
      action: Caliper.Actions.LoggedOut.term,
      object: environment.caliper.appIRI,
      eventTime: new Date().toISOString(),
      target: courseUrl,
      edApp: environment.caliper.appIRI,
      session: this.session
    });
    
    this.sendEvent(event);
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