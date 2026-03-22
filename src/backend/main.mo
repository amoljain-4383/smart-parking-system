import List "mo:core/List";
import Text "mo:core/Text";
import Map "mo:core/Map";
import Stripe "stripe/stripe";
import Principal "mo:core/Principal";
import OutCall "http-outcalls/outcall";
import Runtime "mo:core/Runtime";
import AccessControl "authorization/access-control";
import MixinAuthorization "authorization/MixinAuthorization";

actor {
  // Include access control state and mixin
  let accessControlState = AccessControl.initState();
  include MixinAuthorization(accessControlState);

  // Basic types
  public type UserProfile = {
    name : Text;
    carNumber : Text;
  };

  public type ParkingSpot = {
    id : Text;
    floorId : ?Nat;
  };

  public type Booking = {
    id : Nat;
    carNumber : Text;
    spotId : Text;
    user : Principal;
    paymentStatus : BookingPaymentStatus;
    status : BookingStatus;
    floorId : ?Nat;
  };

  public type BookingStatus = {
    #reserved;
    #occupied;
    #completed;
    #cancelled;
  };

  public type BookingPaymentStatus = {
    #pending;
    #paid;
    #cash;
  };

  public type Notification = {
    id : Nat;
    title : Text;
    message : Text;
  };

  // System state
  var spotIdCounter = 1;
  var bookingIdCounter = 1;
  var notificationIdCounter = 1;
  var isMultiFloor = false;
  var hourlyRate = 50 : Nat;

  let spots = Map.empty<Text, ParkingSpot>();
  let floors = Map.empty<Nat, Nat>();
  let bookings = Map.empty<Nat, Booking>();
  let notifications = Map.empty<Text, List.List<Notification>>();
  let userProfiles = Map.empty<Principal, UserProfile>();
  let carNumberToPrincipal = Map.empty<Text, Principal>();

  // Stripe configuration
  var stripeConfig : ?Stripe.StripeConfiguration = null;

  // ---- Shared parking state (JSON) for cross-device sync ----
  var sharedParkingState : Text = "";

  public query func getSharedState() : async Text {
    sharedParkingState
  };

  public func setSharedState(state : Text) : async () {
    sharedParkingState := state;
  };

  // Core logic
  public query ({ caller }) func isStripeConfigured() : async Bool {
    stripeConfig != null;
  };

  public query ({ caller }) func transform(input : OutCall.TransformationInput) : async OutCall.TransformationOutput {
    OutCall.transform(input);
  };

  public shared ({ caller }) func setStripeConfiguration(config : Stripe.StripeConfiguration) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized: Only admins can set Stripe configuration");
    };
    stripeConfig := ?config;
  };

  func getStripeConfig() : Stripe.StripeConfiguration {
    switch (stripeConfig) {
      case (null) { Runtime.trap("Stripe needs to be first configured") };
      case (?value) { value };
    };
  };

  public func getStripeSessionStatus(sessionId : Text) : async Stripe.StripeSessionStatus {
    await Stripe.getSessionStatus(getStripeConfig(), sessionId, transform);
  };

  public shared ({ caller }) func createCheckoutSession(items : [Stripe.ShoppingItem], successUrl : Text, cancelUrl : Text) : async Text {
    await Stripe.createCheckoutSession(getStripeConfig(), caller, items, successUrl, cancelUrl, transform);
  };
};
