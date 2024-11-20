# Message Feed Display Improvements

## Message Types Analysis

Based on the sample messages, we need to handle these distinct types:

### 1. User Messages
- Keep these simple and clean
- Display just the text content
- Right-aligned with user icon
- Example: "hello there" → Display as is

### 2. System Thinking Messages
- Extract content from <thinking> tags
- Display with subtle styling
- Use italics or different background
- Example: Convert `<thinking>Since this is an initial greeting...</thinking>` to properly formatted text

### 3. Tool Requests
For messages like:
```json
{
  "tool": "ask_followup_question",
  "question": "What would you like to test?",
  ...
}
```
- Extract and display only relevant information
- For ask_followup_question: Show just the question
- For other tools: Show a concise summary of the action

### 4. API Requests
For messages like:
```json
{
  "request": {
    "model": "claude-3-5-sonnet-20240620",
    ...
  }
}
```
- Hide technical details by default
- Add expandable/collapsible option for developers
- Show simplified status indicator

### 5. Tool Responses
For content within toolResponse tags:
- Extract the actual response message
- Remove XML-style tags
- Show clear success/error status
- Format based on tool type

### 6. Error Messages
For messages with error states:
- Clear error highlighting
- Show error message prominently
- Include error details if available
- Add retry/resolution options if applicable

## Display Guidelines

1. Message Grouping:
   - Group related messages (request/response pairs)
   - Show timestamps only for group starts
   - Use indentation or connecting lines for related messages

2. Content Cleaning:
   - Remove technical tags (<thinking>, <toolResponse>, etc.)
   - Parse and format JSON content
   - Extract meaningful text from structured data

3. Visual Hierarchy:
   - Primary: User and assistant messages
   - Secondary: System status and thinking messages
   - Tertiary: Technical details (expandable)

4. Styling:
   - User messages: Blue background, right-aligned
   - Assistant messages: Gray background, left-aligned
   - System messages: Light background, full width
   - Tool messages: Purple accent, structured layout
   - Error messages: Red accent, prominent display

5. Interactive Elements:
   - Expandable technical details
   - Copy button for code or commands
   - Error resolution options
   - Message timestamp hovers

## Implementation Priority

1. Basic message cleaning and formatting
2. Message type-specific displays
3. Grouping and visual hierarchy
4. Interactive elements
5. Error handling improvements

This approach will transform the current raw JSON and tag-heavy display into a clean, user-friendly chat interface while maintaining all necessary information in an accessible format.
