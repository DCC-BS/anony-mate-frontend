// The interface reads each type's display name, which the API serves only in
// the verbose shape; plain API callers get the redact-ready `label:
// description` map without the flag.
export default apiHandler.build("/entity_types/[r:type_name]?verbose=true");
