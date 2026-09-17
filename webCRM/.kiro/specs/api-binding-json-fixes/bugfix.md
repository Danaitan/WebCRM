# Bugfix Requirements Document

## Introduction

Several API endpoints in the webCRM ASP.NET Core MVC project cannot be called successfully ("ยิงไม่ได้"). The root causes fall into three categories, all verified against the controller source and their JavaScript callers:

1. **Uncallable endpoint (must-fix):** `ProspectSetupController.postNotiToApprover` declares three parameters each annotated with `[FromBody]`. ASP.NET Core permits at most one `[FromBody]` parameter per action, so the framework throws `InvalidOperationException` when the action is invoked, making the endpoint impossible to call. The action also lacks `[HttpPost]` despite reading a request body.
   - Server: `webCRM/Controllers/ProspectSetupController.cs` (`postNotiToApprover`)
   - Client: `webCRM/wwwroot/js/prospectSetup.js` (posts `{ title, message, sender }` as a single JSON object)

2. **Parameter binding source mismatch (data not received):** `LoginController.GetProfileByEmail` binds `[FromBody] string email`, but its only caller invokes it as an HTTP GET with a query string (`/Login/GetProfileByEmail?email=...`). The body-bound parameter never receives the query value, so `email` arrives null/empty and downstream data is not returned.
   - Server: `webCRM/Controllers/LoginController.cs` (`GetProfileByEmail`)
   - Client: `webCRM/wwwroot/js/suggestions.js` (`getProfileByEmail` → `fetch('/Login/GetProfileByEmail?email=${email}')`)

3. **Inconsistent error-response shape (data cannot be read):** Multiple GET actions return a bare JSON string on error (e.g. `Content(JsonSerializer.Serialize("...message..."), "application/json")`) while returning an object or array on success. Callers that parse the response and then read `.data` or iterate the result receive a string instead, producing client-side failures ("รับข้อมูลไม่ได้").
   - Server: `webCRM/Controllers/ProspectCallController.cs` (`GetDropDown`, `postHistoryCall`, `GetHistoryCall`), `webCRM/Controllers/SuggestionController.cs` (`GetSuggestionHeader`, `GetSuggestionStatus`)

This document scopes the corrected behavior. No code changes are made here.

## Bug Analysis

### Current Behavior (Defect)

1.1 WHEN a client calls `ProspectSetupController.postNotiToApprover` THEN the system throws `InvalidOperationException` because the action declares more than one `[FromBody]` parameter, so the endpoint cannot be invoked at all.

1.2 WHEN a client sends the notification payload `{ title, message, sender }` to `postNotiToApprover` THEN the system fails to bind the JSON object to the three separate primitive `[FromBody]` parameters and does not process the request.

1.3 WHEN a client sends a request body to `postNotiToApprover` THEN the system does not enforce the POST HTTP method because the action is not annotated with `[HttpPost]`.

1.4 WHEN the `suggestions.js` caller requests `/Login/GetProfileByEmail?email=<value>` as an HTTP GET THEN the system's `[FromBody] string email` parameter receives no value (null/empty) because the value is supplied in the query string, and the profile lookup returns no meaningful data.

1.5 WHEN `ProspectCallController.GetDropDown`, `ProspectCallController.postHistoryCall`, `ProspectCallController.GetHistoryCall`, `SuggestionController.GetSuggestionHeader`, or `SuggestionController.GetSuggestionStatus` encounters an exception THEN the system returns a bare JSON string as the response body, which differs in shape from the object/array returned on success and breaks callers that read `.data` or iterate the result.

### Expected Behavior (Correct)

2.1 WHEN a client calls `postNotiToApprover` THEN the system SHALL accept a single request payload bound with at most one `[FromBody]` parameter (a DTO) so the endpoint can be invoked without a framework binding exception.

2.2 WHEN a client sends the notification payload `{ title, message, sender }` to `postNotiToApprover` THEN the system SHALL bind it to a single request DTO, derive `sender` from the session (`personalId`), and forward `title`, `message`, and the session-derived `sender` to `crmService.PostNotiToApprover`.

2.3 WHEN `postNotiToApprover` is defined THEN the system SHALL restrict it to the POST HTTP method via `[HttpPost]` consistent with it reading a request body.

2.4 WHEN a client requests a profile by email through `GetProfileByEmail` THEN the system SHALL bind the `email` value from the same source the caller sends it, so the profile lookup receives the intended email and returns the profile data. (The fix aligns the server binding and the client call; the chosen transport — GET with `[FromQuery]`/route, or POST with a matching body — must be consistent on both sides.)

2.5 WHEN any of `GetDropDown`, `postHistoryCall`, `GetHistoryCall`, `GetSuggestionHeader`, or `GetSuggestionStatus` encounters an exception THEN the system SHALL return an error response whose JSON shape is consistent with its success response (an object or array the caller can read), rather than a bare JSON string, so callers can read the payload without type errors.

### Unchanged Behavior (Regression Prevention)

3.1 WHEN a client calls any endpoint other than `postNotiToApprover`, `GetProfileByEmail`, and the five error-shape endpoints listed in 1.5 THEN the system SHALL CONTINUE TO behave exactly as before.

3.2 WHEN `postNotiToApprover` successfully processes a request THEN the system SHALL CONTINUE TO derive `sender` from the session `personalId`, invoke `crmService.PostNotiToApprover(title, message, sender)`, and return a success (`Ok`) result.

3.3 WHEN `GetProfileByEmail` receives a valid email THEN the system SHALL CONTINUE TO call `crmService.GetProfileByEmail` and return the JSON profile content, and its `suggestions.js` callers SHALL CONTINUE TO read `profile.personnel_code`.

3.4 WHEN `GetDropDown`, `postHistoryCall`, `GetHistoryCall`, `GetSuggestionHeader`, and `GetSuggestionStatus` execute successfully (no exception) THEN the system SHALL CONTINUE TO return the same success payload (object/array content) it returns today.

3.5 WHEN other actions in `ProspectSetupController`, `LoginController`, `ProspectCallController`, and `SuggestionController` that already bind a single DTO with `[FromBody]` or use `[FromQuery]` correctly are called THEN the system SHALL CONTINUE TO bind and respond as before.

## Bug Condition and Property Specification

### Bug Condition

```pascal
FUNCTION isBugCondition(X)
  INPUT: X of type ApiRequest
  OUTPUT: boolean

  // Endpoint cannot be invoked due to multiple [FromBody] parameters
  RETURN (X.action = "ProspectSetup/postNotiToApprover")

    // Binding source mismatch: value sent on query string, bound from body
    OR (X.action = "Login/GetProfileByEmail" AND X.emailProvidedInQueryString = true)

    // Error path returns a bare JSON string instead of the success-shaped payload
    OR (X.action IN {
          "ProspectCall/GetDropDown",
          "ProspectCall/postHistoryCall",
          "ProspectCall/GetHistoryCall",
          "Suggestions/GetSuggestionHeader",
          "Suggestions/GetSuggestionStatus"
        } AND X.triggersException = true)
END FUNCTION
```

### Property: Fix Checking

```pascal
FOR ALL X WHERE isBugCondition(X) DO
  result ← F'(X)

  IF X.action = "ProspectSetup/postNotiToApprover" THEN
    ASSERT no_binding_exception(result)
      AND sender_taken_from_session(result)
      AND crmService_PostNotiToApprover_called(result)

  ELSE IF X.action = "Login/GetProfileByEmail" THEN
    ASSERT email_bound_from_caller_source(result)
      AND profile_data_returned(result)

  ELSE  // error-shape endpoints
    ASSERT error_response_shape(result) = success_response_shape(X.action)
      AND caller_can_read_payload(result)
  END IF
END FOR
```

### Property: Preservation Checking

```pascal
FOR ALL X WHERE NOT isBugCondition(X) DO
  ASSERT F(X) = F'(X)
END FOR
```

Where **F** is the current (unfixed) code and **F'** is the fixed code.
