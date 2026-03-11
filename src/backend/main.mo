import Map "mo:core/Map";
import Array "mo:core/Array";
import Time "mo:core/Time";
import Runtime "mo:core/Runtime";
import Iter "mo:core/Iter";
import Text "mo:core/Text";
import Order "mo:core/Order";

actor {
  type Layer = {
    name : Text;
    visible : Bool;
    locked : Bool;
    imageData : Text;
  };

  type Frame = {
    layers : [Layer];
  };

  type Project = {
    id : Text;
    name : Text;
    width : Nat;
    height : Nat;
    frames : [Frame];
    createdAt : Time.Time;
    updatedAt : Time.Time;
  };

  module Project {
    public func compareByName(project1 : Project, project2 : Project) : Order.Order {
      Text.compare(project1.name, project2.name);
    };
  };

  let projects = Map.empty<Text, Project>();
  stable var visitCount : Nat = 0;

  public shared func recordVisit() : async Nat {
    visitCount += 1;
    visitCount;
  };

  public query func getVisitCount() : async Nat {
    visitCount;
  };

  public shared ({ caller }) func createProject(id : Text, name : Text, width : Nat, height : Nat) : async () {
    if (projects.containsKey(id)) { Runtime.trap("Project with this id already exists") };

    let timestamp = Time.now();
    let newProject : Project = {
      id;
      name;
      width;
      height;
      frames = [];
      createdAt = timestamp;
      updatedAt = timestamp;
    };

    projects.add(id, newProject);
  };

  public shared ({ caller }) func saveProject(id : Text, name : Text, width : Nat, height : Nat, frames : [Frame]) : async () {
    let existingProject = switch (projects.get(id)) {
      case (null) { Runtime.trap("Project not found") };
      case (?project) { project };
    };

    let updatedProject : Project = {
      id;
      name;
      width;
      height;
      frames;
      createdAt = existingProject.createdAt;
      updatedAt = Time.now();
    };

    projects.add(id, updatedProject);
  };

  public query ({ caller }) func loadProject(id : Text) : async Project {
    switch (projects.get(id)) {
      case (null) { Runtime.trap("Project not found") };
      case (?project) { project };
    };
  };

  public query ({ caller }) func listProjects() : async [Project] {
    projects.values().toArray().sort(Project.compareByName);
  };

  public shared ({ caller }) func deleteProject(id : Text) : async () {
    switch (projects.containsKey(id)) {
      case (false) { Runtime.trap("Project not found") };
      case (true) { projects.remove(id) };
    };
  };
};
