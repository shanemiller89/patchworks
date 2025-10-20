# GitHub Copilot Custom Slash Prompts - Best Practices

## Overview

GitHub Copilot supports custom slash commands (also called custom instructions or agent instructions) that allow developers to create reusable, context-aware prompts for common tasks. This document outlines best practices for creating and using custom '/' prompts effectively.

## What Are Custom Slash Prompts?

Custom slash prompts are predefined instructions that can be triggered using the `/` prefix in GitHub Copilot Chat. They help standardize common workflows, ensure consistency across teams, and reduce repetitive prompt writing.

### Built-in Slash Commands

GitHub Copilot includes several built-in commands:
- `/explain` - Explain selected code
- `/fix` - Suggest fixes for problems
- `/tests` - Generate unit tests
- `/help` - Get help with Copilot
- `/clear` - Clear conversation
- `/doc` - Add documentation comments

### Custom Slash Commands

Custom commands extend these built-in capabilities with project-specific or team-specific workflows.

## Best Practices

### 1. **Clear and Descriptive Names**

**Good:**
```
/review-security - Review code for security vulnerabilities
/add-error-handling - Add comprehensive error handling
/optimize-performance - Analyze and optimize performance bottlenecks
```

**Bad:**
```
/r - Review code (too ambiguous)
/doStuff - Do something (unclear purpose)
/fix2 - Fix code version 2 (confusing versioning)
```

**Guidelines:**
- Use descriptive, action-oriented names
- Use hyphens for multi-word commands
- Keep names concise but meaningful (2-4 words)
- Avoid abbreviations unless universally understood

### 2. **Provide Context and Constraints**

Custom prompts should include:
- **Purpose**: What the command does
- **Scope**: What code it applies to
- **Constraints**: Specific requirements or limitations
- **Output format**: Expected result format

**Example:**
```markdown
/review-api:
Review the selected API endpoint code for:
- RESTful design principles
- Proper HTTP status codes
- Input validation
- Error handling
- Rate limiting considerations
- Security vulnerabilities
Provide specific recommendations with code examples.
```

### 3. **Include Code Style and Standards**

Incorporate your team's coding standards directly into prompts:

```markdown
/add-component:
Create a React component following our standards:
- Use TypeScript with explicit types
- Use functional components with hooks
- Include PropTypes or TypeScript interfaces
- Add JSDoc comments for public props
- Follow our naming convention: PascalCase for components
- Include error boundaries where appropriate
- Add unit tests using Jest and React Testing Library
```

### 4. **Specify Examples and Patterns**

Provide concrete examples of desired output:

```markdown
/add-logging:
Add logging to the selected function using our logging standards:

Example format:
```typescript
logger.info('Function started', {
  functionName: 'processPayment',
  userId: user.id,
  timestamp: new Date().toISOString()
});

try {
  // existing code
  logger.debug('Processing step completed', { step: 'validation' });
} catch (error) {
  logger.error('Function failed', {
    error: error.message,
    stack: error.stack
  });
  throw error;
}
```

Use structured logging with context objects.
\```
```

### 5. **Make Prompts Composable**

Design prompts that can work together:

```markdown
/add-types - Add TypeScript types to JavaScript code
/add-tests - Generate unit tests for the code
/add-docs - Add comprehensive documentation

# These can be used in sequence:
# 1. /add-types
# 2. /add-tests  
# 3. /add-docs
```

### 6. **Version-Specific Instructions**

Include version information for libraries and frameworks:

```markdown
/create-api-route:
Create a Next.js 14 App Router API route with:
- Use the new Route Handlers (app/api/...)
- Implement proper TypeScript types for Request/Response
- Use NextResponse for responses
- Include error handling with appropriate status codes
- Add request validation using Zod
- Follow Next.js 14 best practices for caching and revalidation
```

### 7. **Security-Focused Prompts**

Create specific prompts for security reviews:

```markdown
/security-audit:
Perform a security audit of the selected code:

Check for:
- SQL injection vulnerabilities
- XSS (Cross-Site Scripting) risks
- CSRF token validation
- Input validation and sanitization
- Secure password handling (hashing, salting)
- Proper authentication/authorization
- Sensitive data exposure
- Insecure dependencies
- Rate limiting implementation

Provide severity ratings (Critical/High/Medium/Low) and remediation steps.
```

### 8. **Testing and Quality Prompts**

```markdown
/comprehensive-tests:
Generate comprehensive tests for the selected code:

Include:
- Unit tests for all public functions
- Edge cases and boundary conditions
- Error scenarios and exception handling
- Mock external dependencies
- Test data factories for complex objects
- Integration tests if applicable
- Achieve 80%+ code coverage

Use Jest and follow Arrange-Act-Assert pattern.
Provide setup/teardown code if needed.
```

### 9. **Refactoring Prompts**

```markdown
/refactor-clean:
Refactor the selected code following clean code principles:

Apply:
- Single Responsibility Principle
- DRY (Don't Repeat Yourself)
- Extract magic numbers to named constants
- Improve variable and function naming
- Reduce cyclomatic complexity
- Extract complex conditionals to well-named functions
- Add descriptive comments only where necessary
- Maintain backward compatibility

Explain each significant change.
```

### 10. **Documentation Prompts**

```markdown
/add-api-docs:
Generate API documentation for the selected endpoint:

Include:
- Endpoint URL and HTTP method
- Description of functionality
- Request parameters (path, query, body)
- Request example with all fields
- Response format for success (200, 201)
- Error responses (400, 401, 403, 404, 500)
- Authentication requirements
- Rate limiting information
- Example cURL command

Format: OpenAPI 3.0 specification
```

## Advanced Patterns

### 1. **Context-Aware Prompts**

```markdown
/fix-with-context:
Fix the issue in the selected code while considering:
- The surrounding codebase architecture
- Existing error handling patterns in the project
- Dependencies already imported in the file
- Our project's TypeScript configuration
- Performance implications
- Backward compatibility requirements

Provide the fix with minimal changes to surrounding code.
```

### 2. **Multi-Step Workflows**

```markdown
/feature-complete:
Complete the feature implementation with all requirements:

Step 1: Implement the core functionality
Step 2: Add input validation
Step 3: Add error handling
Step 4: Add logging
Step 5: Add unit tests
Step 6: Add integration tests
Step 7: Add documentation
Step 8: Add type safety

Show progress after each step and ask for confirmation before proceeding.
```

### 3. **Language/Framework-Specific Prompts**

Create prompts tailored to specific technologies:

```markdown
/django-view:
Create a Django class-based view with:
- Proper authentication (LoginRequiredMixin)
- Permission checks
- QuerySet optimization (select_related/prefetch_related)
- Pagination
- Form validation
- Success/error message handling
- Comprehensive docstring
- Type hints (Django 4.2+)

/react-hook:
Create a custom React hook with:
- TypeScript types for parameters and return value
- Proper dependency arrays
- Cleanup functions
- Error handling
- JSDoc documentation
- Usage example
```

### 4. **Performance-Focused Prompts**

```markdown
/optimize-performance:
Analyze and optimize the selected code for performance:

Consider:
- Time complexity (Big O notation)
- Space complexity
- Database query optimization (N+1 queries)
- Caching opportunities (memoization, Redis)
- Async/await vs Promise.all for parallelization
- Lazy loading and code splitting
- Memory leaks and proper cleanup
- Bundle size impact

Provide before/after comparisons with expected improvements.
```

## Anti-Patterns to Avoid

### ❌ Don't: Create Overly Broad Prompts

```markdown
/fix-everything - Fix all issues in the code
```
Too vague, leads to inconsistent results.

### ❌ Don't: Use Ambiguous Language

```markdown
/make-it-better - Improve the code somehow
```
Unclear expectations and output.

### ❌ Don't: Ignore Project Context

```markdown
/add-tests - Add some tests
```
Should specify testing framework, style, coverage expectations.

### ❌ Don't: Create One-Time-Use Prompts

```markdown
/fix-that-bug-in-auth-on-line-42
```
Too specific, not reusable.

### ❌ Don't: Omit Expected Behavior

```markdown
/refactor - Refactor the code
```
Should specify what aspects to refactor and why.

## Organization and Maintenance

### 1. **Categorize Your Prompts**

Organize prompts by purpose:

```
/dev-*       - Development tasks (dev-setup, dev-env)
/test-*      - Testing tasks (test-unit, test-integration)
/doc-*       - Documentation tasks (doc-api, doc-readme)
/review-*    - Code review tasks (review-security, review-performance)
/refactor-*  - Refactoring tasks (refactor-clean, refactor-types)
```

### 2. **Version Control**

- Store custom prompts in a `.github/copilot-instructions.md` file
- Version control this file with your repository
- Document changes in commit messages
- Review and update prompts regularly

### 3. **Team Collaboration**

- Review custom prompts in team meetings
- Gather feedback on prompt effectiveness
- Iterate based on real-world usage
- Share successful prompts across teams

### 4. **Documentation**

Create a prompt catalog:

```markdown
# Project Custom Prompts

## Code Generation
- `/add-component` - Create React component with our standards
- `/add-api-route` - Create API endpoint with validation

## Testing
- `/comprehensive-tests` - Generate full test suite
- `/test-edge-cases` - Add edge case tests

## Code Review
- `/review-security` - Security-focused code review
- `/review-performance` - Performance analysis

## Documentation
- `/add-api-docs` - Generate API documentation
- `/add-jsdoc` - Add JSDoc comments
```

## Measuring Effectiveness

Track the effectiveness of your custom prompts:

1. **Usage Metrics**
   - How often is the prompt used?
   - Which prompts are most popular?

2. **Quality Metrics**
   - Does the output match expectations?
   - How much manual editing is required?
   - Do prompts reduce review cycle time?

3. **Consistency Metrics**
   - Do different team members get similar results?
   - Does output match project standards?

4. **Feedback Loop**
   - Collect team feedback quarterly
   - Update prompts based on learnings
   - Remove unused or ineffective prompts

## Examples for Common Use Cases

### Backend Development

```markdown
/create-service:
Create a service class with:
- Dependency injection
- Interface-based design
- Async/await for I/O operations
- Error handling with custom exceptions
- Logging at appropriate levels
- Unit test file with mocked dependencies

/add-validation:
Add input validation using class-validator:
- All required fields
- Type checking
- Format validation (email, URL, etc.)
- Custom business rule validation
- Meaningful error messages
- Return validation result object
```

### Frontend Development

```markdown
/create-form:
Create a form component with:
- React Hook Form integration
- Zod schema validation
- Accessible form fields (ARIA labels)
- Loading and error states
- Success/error toast notifications
- Responsive design (mobile-first)
- TypeScript types for form data

/add-accessibility:
Improve accessibility of the selected component:
- Add ARIA labels and roles
- Ensure keyboard navigation works
- Add focus indicators
- Improve color contrast
- Add screen reader text where needed
- Test tab order
- Add skip links if applicable
```

### Database Operations

```markdown
/create-migration:
Create a database migration for the described changes:
- Use our migration tool (Prisma/TypeORM/etc)
- Include both up and down migrations
- Add appropriate indexes
- Include data migration if needed
- Add foreign key constraints
- Document breaking changes
- Include rollback procedure

/optimize-query:
Optimize the selected database query:
- Analyze and improve query performance
- Add appropriate indexes
- Reduce N+1 queries
- Use joins instead of multiple queries
- Consider caching opportunities
- Explain the optimization rationale
- Provide before/after execution plans
```

## Integration with CI/CD

Custom prompts can be referenced in CI/CD pipelines:

```yaml
# .github/workflows/code-review.yml
name: AI Code Review
on: [pull_request]

jobs:
  review:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: AI Security Review
        run: |
          # Use custom /security-audit prompt
          gh copilot review --prompt security-audit
```

## Conclusion

Effective custom slash prompts:
- ✅ Are clear and specific
- ✅ Include context and constraints
- ✅ Follow project standards
- ✅ Are well-documented
- ✅ Are regularly updated
- ✅ Provide consistent, high-quality output

By following these best practices, teams can leverage GitHub Copilot more effectively, maintain code quality, and accelerate development while ensuring consistency across the codebase.

## Resources

- [GitHub Copilot Documentation](https://docs.github.com/en/copilot)
- [Copilot Chat Documentation](https://docs.github.com/en/copilot/github-copilot-chat)
- [Prompt Engineering Guide](https://www.promptingguide.ai/)
- [OpenAI Best Practices](https://platform.openai.com/docs/guides/prompt-engineering)

---

*Last Updated: 2025-10-20*
*Document Version: 1.0*
