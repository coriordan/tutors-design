import * as caliper from 'caliper-ims';
import environment from "../environment";

export class CaliperService {
  private sensor : caliper.Sensor;
  private session : caliper.Session;
  // private person : caliper.Person;
  // private application : caliper.SoftwareApplication;
  
  constructor() {
    sensor = initializeSensor();
    session = startSession();
  }
  
  private initializeSensor() {
    let sensor = caliper.Sensor;
    sensor.initialize(environment.caliper.appIRI.concat("/sensors/1"));
    
    let client = caliper.Clients.HttpClient;
    
    let options = {
      uri: environment.caliper.endpoint,
      json: true
    };
    
    client.initialize(sensor.id.concat("/clients/1"), options);
    sensor.registerClient(client);
    
    return sensor;
  }
  
  private startSession() {
    let sessionStart = new Date().toISOString();
    let sessionId = caliper.Validator.generateUUID;
    
    let session = caliper.EntityFactory().create(caliper.Session, {
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
    let sessionEventId = caliper.Validator.generateUUID;
    
    let event = caliper.EventFactory().create(caliper.SessionEvent, {
      id: sessionEventId,
      actor: userId,
      action: caliper.Actions.LoggedIn.term,
      object: caliper.appIRI,
      eventTime: new Date().toISOString(),
      target: courseUrl,
      edApp: caliper.appIRI,
      session: this.session
    });
    
    this.sendEvent(event);
  }
  
  sendEvent(event: caliper.Event) {
    var data = [];
    date.push(event);
    
    let opts {
      sensor: this.sensor.id,
      sendTime: new Date().toISOString(),
      dataVersion: "http://purl.imsglobal.org/ctx/caliper/v1p1",
      data: data
    };
    
    let envelope = this.sensor.createEnvelope(opts);
    
    sensor.sendToClient(envelope);
  } 
}