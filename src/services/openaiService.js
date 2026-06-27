/**
 * AI Service for Roadmap and Quiz Generation
 * Strategy: OpenRouter (DeepSeek Priority) -> Static Fallback
 */

const GROQ_API_KEY = import.meta.env.VITE_GROQ_API_KEY;
const GROQ_MODEL = 'llama-3.3-70b-versatile';

let isOfflineMode = false;

// Robust JSON Extractor for DeepSeek/Reasoning Models
function parseJSON(content) {
    try {
        // 1. Remove <think>...</think> blocks common in DeepSeek R1
        let cleanContent = content.replace(/<think>[\s\S]*?<\/think>/g, '').trim();

        // 1.5 Fix unquoted letters (A-D) from AI
        cleanContent = cleanContent.replace(/"correctIndex":\s*([A-Da-d])/g, '"correctIndex": "$1"');

        // 2. Extract JSON Array [...]
        const firstBracket = cleanContent.indexOf('[');
        const lastBracket = cleanContent.lastIndexOf(']');

        if (firstBracket === -1 || lastBracket === -1) return [];

        const jsonString = cleanContent.substring(firstBracket, lastBracket + 1);
        const parsed = JSON.parse(jsonString);

        return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
        console.warn("JSON Parse Error:", error);
        return [];
    }
}

// Sanitize Object for Firestore (No undefined values)
function sanitizeTopic(topic, index) {
    return {
        id: `topic-${index + 1}`,
        title: topic.title || `Topic ${index + 1}`,
        description: topic.description || `Mastering ${topic.title || 'this concept'}`,
        status: 'unlocked',
        subtopics: Array.isArray(topic.subtopics)
            ? topic.subtopics.map((sub, sIdx) => ({
                id: `sub-${index + 1}-${sIdx + 1}`,
                title: typeof sub === 'string' ? sub : (sub.title || `Subtopic ${sIdx + 1}`),
                description: typeof sub === 'string' ? 'Deep concept details.' : (sub.description || 'Deep concept details.'),
                status: 'unlocked'
            }))
            : []
    };
}

async function callAI(messages) {
    if (isOfflineMode) throw new Error('Offline Mode Active');
    return await callGroq(messages);
}

async function callGroq(messages) {
    if (!GROQ_API_KEY) throw new Error('No Groq Key');

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${GROQ_API_KEY}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            model: GROQ_MODEL,
            messages: messages,
            temperature: 0.2,
            max_tokens: 8192
        })
    });

    if (!response.ok) {
        throw new Error(`Groq API returned status: ${response.status}`);
    }

    const data = await response.json();
    return data.choices[0].message.content;
}

export async function generateRoadmap(skill) {
    if (isOfflineMode) return getStaticRoadmap(skill);

    try {
        const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5001';
        const response = await fetch(`${backendUrl}/api/generate-roadmap`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ skill })
        });
        
        if (!response.ok) {
            throw new Error(`Backend returned status: ${response.status}`);
        }
        
        const topics = await response.json();
        if (!Array.isArray(topics) || topics.length === 0) throw new Error('Invalid response');

        // Sanitize and Map for Firestore
        return topics.map((topic, index) => sanitizeTopic(topic, index));

    } catch (error) {
        console.warn('Dynamic Generation Failed. Using Static Fallback:', error);
        return getStaticRoadmap(skill);
    }
}

// --- STATIC BACKUP DATA (Professional 10x10) ---
const STATIC_ROADMAPS = {
    'c++': [
        { title: '01. C++ Fundamentals', subtopics: ['Toolchain (Clang/GCC)', 'Compilation Stages', 'Memory Model', 'Pointers & References', 'RAII Principles', 'Move Semantics', 'Lambda Expressions', 'Smart Pointers', 'Debugging (GDB)', 'Build Systems (CMake)'] },
        { title: '02. OOP & Design', subtopics: ['Polymorphism', 'Virtual Tables', 'Multiple Inheritance', 'Dependency Injection', 'Factory Pattern', 'Observer Pattern', 'SOLID Principles', 'Operator Overloading', 'Templates', 'CRTP'] },
        { title: '03. STL Mastery', subtopics: ['Containers (Vector, Map)', 'Iterators', 'Algorithms', 'Allocators', 'Adapters', 'Functional Programming', 'Ranges (C++20)', 'Concurrency Support', 'Regular Expressions', 'Filesystem Lib'] },
        { title: '04. Advanced Memory', subtopics: ['Stack vs Heap', 'Memory Leaks', 'Valgrind Usage', 'Custom Allocators', 'Pool Allocation', 'Cache Locality', 'Alignment', 'Buffer Overflows', 'Address Sanitizer', 'Memory Barriers'] },
        { title: '05. Concurrency', subtopics: ['Threads (std::thread)', 'Mutex & Locks', 'Condition Variables', 'Atomics', 'Memory Order', 'Deadlocks', 'Async/Future', 'Thread Pools', 'Coroutines (C++20)', 'Parallel Algorithms'] },
        { title: '06. Networking', subtopics: ['Sockets API', 'TCP/IP Stack', 'UDP Programming', 'Asio/Boost.Asio', 'HTTP Protocol', 'REST Clients', 'Serialization', 'Protocol Buffers', 'WebSockets', 'OpenSSL Integration'] },
        { title: '07. Modern C++ (17/20/23)', subtopics: ['Structured Binding', 'Optional & Variant', 'Concepts', 'Modules', 'Spaceship Operator', 'Constexpr', 'Span (std::span)', 'Format Library', 'Source Location', 'Fold Expressions'] },
        { title: '08. Performance', subtopics: ['Profiling', 'Benchmarking', 'Compiler Optimizations', 'Inline Assembly', 'SIMD Intrinsics', 'Branch Prediction', 'Zero-Copy', 'Latency Reduction', 'Lock-free Structures', 'Flame Graphs'] },
        { title: '09. Systems Programming', subtopics: ['OS Primitives', 'File Descriptors', 'Signals', 'Inter-process Comm (IPC)', 'Shared Memory', 'System Calls', 'Driver Basics', 'Embedded Constraints', 'Real-time Systems', 'Kernel Modules'] },
        { title: '10. Testing & CI/CD', subtopics: ['Google Test', 'Catch2', 'Unit Testing', 'Mocking', 'Integration Tests', 'Fuzz Testing', 'Static Analysis', 'Clang-Tidy', 'GitHub Actions', 'Dockerizing C++'] }
    ],
    'typescript': [
        { title: '01. Type System Core', subtopics: ['Inference', 'Structural Typing', 'Union/Intersection', 'Type Aliases', 'Interfaces', 'Enums vs Const Enums', 'Unknown vs Any', 'Never Type', 'Void', 'Type Assertions'] },
        { title: '02. Advanced Types', subtopics: ['Generics deeply', 'Keyof Operator', 'Typeof Operator', 'Indexed Access', 'Conditional Types', 'Mapped Types', 'Template Literals', 'Utility Types', 'Infer Keyword', 'Recursive Types'] },
        { title: '03. OOP in TS', subtopics: ['Classes', 'Access Modifiers', 'Abstract Classes', 'Implements vs Extends', 'Static Members', 'Getters/Setters', 'Readonly Props', 'Parameter Props', 'This Polymorphism', 'Mixins'] },
        { title: '04. Functional TS', subtopics: ['Pure Functions', 'Immutability', 'Higher Order Functions', 'Currying', 'Composition', 'Discriminated Unions', 'Exhaustive Checking', 'Option/Result Monads', 'FP Libraries', 'Pattern Matching'] },
        { title: '05. React with TS', subtopics: ['Component Typing', 'Props Interfaces', 'Hooks Typing', 'Event Handling', 'Ref Typing', 'Context Typing', 'Generic Components', 'Discriminated Props', 'Render Props', 'Custom Hooks'] },
        { title: '06. Backend Node.js', subtopics: ['Express/NestJS Typing', 'DTOs', 'Decorators', 'ORM Integration', 'API Response Types', 'Middleware Types', 'Validation (Zod)', 'Env Variables', 'Microservices', 'gRPC'] },
        { title: '07. Configuration', subtopics: ['tsconfig.json', 'Strict Mode', 'Module Resolution', 'Path Aliases', 'Source Maps', 'Lib Options', 'Include/Exclude', 'Incremental Builds', 'Composite Projects', 'Declaration Files'] },
        { title: '08. Tooling', subtopics: ['ESLint', 'Prettier', 'TS-Node', 'Nodemon', 'Webpack/Vite', 'Babel Integration', 'SimplyTyped', 'Type Coverage', 'Monorepos (Nx/Turbo)', 'Publishing Packages'] },
        { title: '09. Testing', subtopics: ['Jest with TS', 'Ts-jest', 'Mocking Types', 'Integration Tests', 'E2E (Cypress/Playwright)', 'Snapshot Testing', 'Type-only Imports', 'Test Utils', 'CI Pipelines', 'Debug Config'] },
        { title: '10. Design Patterns', subtopics: ['Singleton', 'Factory', 'Observer', 'Strategy', 'Adapter', 'Decorator', 'Composite', 'Command', 'Repository', 'Dependency Injection'] }
    ],
    'python': [
        { title: '01. Python Internals', subtopics: ['CPython', 'Bytecode', 'GIL', 'Memory Management', 'Ref Counting', 'Garbage Collection', '__slots__', 'Object Model', 'MRO', 'Metaclasses'] },
        { title: '02. Advanced Functional', subtopics: ['Decorators', 'Generators', 'Iterators', 'Context Managers', 'Lambdas', 'Map/Filter/Reduce', 'Functools', 'Itertools', 'Closures', 'List Comprehensions'] },
        { title: '03. Concurrency', subtopics: ['Threading', 'Multiprocessing', 'Asyncio', 'Event Loop', 'Coroutines', 'Tasks/Futures', 'Aiohttp', 'Locks & Semaphores', 'Queue', 'ThreadPoolExecutor'] },
        { title: '04. Data Engineering', subtopics: ['Pandas', 'NumPy', 'Arrow', 'Polars', 'ETL Pipelines', 'Airflow', 'SQLAlchemy', 'Pydantic', 'Data Validation', 'Serialization'] },
        { title: '05. Web Architecture', subtopics: ['WSGI vs ASGI', 'Flask', 'FastAPI', 'Django ORM', 'Middleware', 'Authentication', 'Rate Limiting', 'WebSockets', 'GraphQL', 'Celery Tasks'] },
        { title: '06. Testing & QA', subtopics: ['Pytest', 'Fixtures', 'Mocking', 'Parametrization', 'Coverage', 'Tox', 'Linting (Ruff)', 'Type Checking (Mypy)', 'Black', 'CI/CD'] },
        { title: '07. Networking', subtopics: ['Sockets', 'Requests Lib', 'HTTP/2', 'gRPC', 'Protocol Buffers', 'Scraping (Scrapy)', 'Selenium', 'API Design', 'OAuth2', 'Security Headers'] },
        { title: '08. Packaging', subtopics: ['Pip', 'Poetry', 'Setuptools', 'Wheels', 'Virtualenvs', 'Docker', 'PyPI Publishing', 'Dependencies', 'Lock Files', 'Entry Points'] },
        { title: '09. Cloud & DevOps', subtopics: ['AWS SDK (Boto3)', 'Serverless', 'Lambda', 'Terraform', 'Kubernetes Client', 'Logging (ELK)', 'Monitoring (Prometheus)', 'Sentry', 'Secrets Mgmt', '12-Factor App'] },
        { title: '10. Machine Learning', subtopics: ['Scikit-Learn', 'TensorFlow', 'PyTorch', 'Model Training', 'Inference', 'NLP Basics', 'Computer Vision', 'Jupyter', 'MLOps', 'Deployment'] }
    ],
    'javascript': [
        { title: '01. JS Fundamentals', subtopics: ['Variables (let/const)', 'Data Types', 'Operators', 'Control Flow', 'Functions (Arrow)', 'Scope & Hoisting', 'Closures', 'Event Loop', 'This Keyword', 'Prototypes'] },
        { title: '02. DOM Manipulation', subtopics: ['Selectors', 'Event Listeners', 'Traversing DOM', 'Creating Elements', 'Styling via JS', 'Forms & Validation', 'Browser APIs', 'Local Storage', 'Session Storage', 'Cookies'] },
        { title: '03. Async JS', subtopics: ['Callbacks', 'Promises', 'Async/Await', 'Fetch API', 'Error Handling', 'Microtask Queue', 'Event Bubbling', 'Debouncing', 'Throttling', 'Web Workers'] },
        { title: '04. ES6+ Features', subtopics: ['Destructuring', 'Spread/Rest', 'Template Literals', 'Classes', 'Modules', 'Maps & Sets', 'Iterators', 'Generators', 'Optional Chaining', 'Nullish Coalescing'] },
        { title: '05. Tooling', subtopics: ['NPM/Yarn', 'Webpack', 'Babel', 'ESLint', 'Prettier', 'Vite', 'Parcel', 'Debugger', 'Chrome DevTools', 'Postman'] },
        { title: '06. Functional JS', subtopics: ['Pure Functions', 'Immutability', 'Higher-Order Functions', 'Map/Filter/Reduce', 'Currying', 'Composition', 'Recursion', 'Side Effects', 'Referential Transparency', 'Ramda/Lodash'] },
        { title: '07. OOP in JS', subtopics: ['Classes', 'Inheritance', 'Polymorphism', 'Encapsulation', 'Static Methods', 'Getters/Setters', 'Private Fields', 'Factory Functions', 'Constructors', 'Mixins'] },
        { title: '08. Testing', subtopics: ['Unit Testing', 'Jest', 'Mocha', 'Chai', 'TDD', 'BDD', 'Integration Tests', 'E2E Testing', 'Cypress', 'Playwright'] },
        { title: '09. Performance', subtopics: ['Memory Management', 'Garbage Collection', 'Critical Rendering Path', 'Reflow vs Repaint', 'Lazy Loading', 'Tree Shaking', 'Code Splitting', 'Web/Service Workers', 'Lighthouse', 'FPS Optimization'] },
        { title: '10. Security', subtopics: ['XSS', 'CSRF', 'CORS', 'Sanitization', 'Content Security Policy', 'Auth Tokens (JWT)', 'HTTPS', 'Secure Cookies', 'Input Validation', 'OWASP Top 10'] }
    ],
    'react': [
        { title: '01. React Core', subtopics: ['JSX', 'Components', 'Props', 'State', 'Events', 'Conditional Rendering', 'Lists & Keys', 'Forms', 'Lifecycle Methods', 'Fragments'] },
        { title: '02. Hooks Mastery', subtopics: ['useState', 'useEffect', 'useContext', 'useReducer', 'useCallback', 'useMemo', 'useRef', 'useLayoutEffect', 'Custom Hooks', 'Rules of Hooks'] },
        { title: '03. Advanced Patterns', subtopics: ['HOCs', 'Render Props', 'Compound Components', 'Context API', 'Portals', 'Error Boundaries', 'Suspense', 'Lazy Loading', 'Profiler', 'Strict Mode'] },
        { title: '04. State Management', subtopics: ['Context + Reducer', 'Redux Toolkit', 'Zustand', 'Recoil', 'Jotai', 'MobX', 'XState', 'React Query', 'SWR', 'Apollo Client'] },
        { title: '05. Routing', subtopics: ['React Router', 'Dynamic Routes', 'Nested Routes', 'Protected Routes', 'Query Params', 'Loaders (v6.4)', 'Actions', 'NavLinks', 'History API', 'Code Splitting Routes'] },
        { title: '06. Styling', subtopics: ['CSS Modules', 'Styled Components', 'Emotion', 'Tailwind CSS', 'SASS/SCSS', 'Chakra UI', 'MUI', 'Radix UI', 'Shadcn/UI', 'Responsive Design'] },
        { title: '07. Forms', subtopics: ['Controlled vs Uncontrolled', 'React Hook Form', 'Formik', 'Yup', 'Zod', 'Validation', 'Multi-step Forms', 'File Uploads', 'Accessibility', 'Keyboard Navigation'] },
        { title: '08. Performance', subtopics: ['Re-renders', 'React.memo', 'useMemo/Callback', 'Virtualization', 'Code Splitting', 'Bundle Analysis', 'Key Props', 'State Colocation', 'Transition API', 'Server Components'] },
        { title: '09. Testing', subtopics: ['React Testing Library', 'Jest', 'Vitest', 'Mocking', 'Snapshot Testing', 'User Events', 'MSW', 'Cypress', 'Playwright', 'Accessibility Testing'] },
        { title: '10. SSR & Frameworks', subtopics: ['Next.js Basics', 'Server Side Rendering', 'Static Site Generation', 'Hydration', 'Remix', 'Gatsby', 'SEO Basics', 'Vercel', 'Edge Functions', 'Streaming'] }
    ],
    'default': [
        { title: '01. CS Foundations', subtopics: ['Binary Systems', 'Logic Gates', 'Architecture', 'Memory', 'OS Basics', 'Networking (OSI)', 'Big O Notation', 'CLI Mastery', 'IDE Setup', 'Environment Variables'] },
        { title: '02. Code Principles', subtopics: ['Data Types', 'Control Flow', 'Functions', 'Clean Code', 'Naming', 'Comments', 'Debugging', 'Git Basics', 'Problem Solving', 'Error Handling'] },
        { title: '03. Data Structures', subtopics: ['Arrays', 'Linked Lists', 'Stacks', 'Queues', 'Hash Maps', 'Trees', 'Graphs', 'Heaps', 'Vectors', 'Structure Selection'] },
        { title: '04. Algorithms', subtopics: ['Searching', 'Sorting', 'Recursion', 'Tree Traversal', 'Graph Pathing', 'Dynamic Programming', 'Greedy Algos', 'Two Pointers', 'Sliding Window', 'Backtracking'] },
        { title: '05. Design Patterns', subtopics: ['OOP', 'Functional Programming', 'Singleton', 'Factory', 'Observer', 'SOLID Principles', 'DRY', 'KISS', 'Modularity', 'Abstraction'] },
        { title: '06. Tools & Ops', subtopics: ['Git Flow', 'Pull Requests', 'Package Managers', 'Linters', 'DevTools', 'API Testing', 'Docker', 'CI/CD', 'VirtualEnv', 'Shell Scripting'] },
        { title: '07. Databases', subtopics: ['SQL Basics', 'NoSQL', 'ACID', 'Normalization', 'Indexing', 'REST APIs', 'Client-Server', 'Microservices', 'Auth', 'Scalability'] },
        { title: '08. Quality Assurance', subtopics: ['Unit Tests', 'Integration Tests', 'E2E Tests', 'TDD', 'Mocking', 'Coverage', 'Edge Cases', 'Security Testing', 'Automation', 'Regression'] },
        { title: '09. Professional Skills', subtopics: ['Portfolio', 'Resumes', 'Interviews', 'Communication', 'Teamwork', 'Agile', 'Time Management', 'Continuous Learning', 'Freelancing', 'Networking'] },
        { title: '10. Specialization', subtopics: ['Cloud', 'AI/ML', 'Web Dev', 'Mobile', 'Security', 'DevOps', 'Data Science', 'Game Dev', 'Blockchain', 'IoT'] }
    ]
};

function getStaticRoadmap(skill) {
    const normalizedSkill = skill.toLowerCase();

    // Exact & Fuzzy Matching Priority
    if (normalizedSkill.includes('python')) return mapToFormat(STATIC_ROADMAPS['python']);
    if (normalizedSkill.includes('type') || normalizedSkill.includes('ts')) return mapToFormat(STATIC_ROADMAPS['typescript']);
    if (normalizedSkill.includes('c++') || normalizedSkill.includes('cpp') || normalizedSkill.includes('c plus')) return mapToFormat(STATIC_ROADMAPS['c++']);
    if (normalizedSkill.includes('react')) return mapToFormat(STATIC_ROADMAPS['react']);
    if (normalizedSkill.includes('java') && !normalizedSkill.includes('script')) return mapToFormat(STATIC_ROADMAPS['default']);
    if (normalizedSkill.includes('script') || normalizedSkill.includes('js')) return mapToFormat(STATIC_ROADMAPS['javascript']);

    return mapToFormat(STATIC_ROADMAPS['default']);
}

function mapToFormat(data) {
    if (!Array.isArray(data)) return mapToFormat(STATIC_ROADMAPS['default']);

    return data.map((topic, index) => ({
        id: `topic-${index + 1}`,
        title: topic.title,
        description: `Mastering ${topic.title}`,
        status: 'unlocked',
        subtopics: topic.subtopics.map((sub, sIdx) => ({
            id: `sub-${index + 1}-${sIdx + 1}`,
            title: typeof sub === 'string' ? sub : sub.title,
            description: typeof sub === 'string' ? 'Details' : sub.description,
            status: 'unlocked'
        }))
    }));
}

// Synchronous fallback
export function generateFallbackRoadmap(skill) {
    return getStaticRoadmap(skill);
}

export async function generateTestQuestions(topic, skill, count = 15, difficulty = 'Beginner') {
    try {
        const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5001';
        const response = await fetch(`${backendUrl}/api/generate-roadmap-test`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ topic, skill, count, difficulty })
        });
        
        if (!response.ok) {
            throw new Error(`Backend returned status: ${response.status}`);
        }

        const questions = await response.json();
        if (!Array.isArray(questions) || questions.length === 0) throw new Error('Empty or invalid response');
        
        return questions.slice(0, count).map((q, index) => {
            let cIndex = q.correctIndex;
            if (typeof cIndex === 'string') {
                const map = { 'A': 0, 'a': 0, 'B': 1, 'b': 1, 'C': 2, 'c': 2, 'D': 3, 'd': 3, '1': 0, '2': 1, '3': 2, '4': 3 };
                cIndex = map[cIndex] !== undefined ? map[cIndex] : parseInt(cIndex);
            }
            return {
                id: index + 1,
                question: q.question,
                options: q.options || ['A', 'B', 'C', 'D'],
                correctIndex: typeof cIndex === 'number' && !isNaN(cIndex) ? cIndex : 0,
                explanation: q.explanation || 'Correct answer highlighted.'
            };
        });

    } catch (error) {
        console.warn('AI test generation failed, using static fallback:', error);
        return Array.from({ length: count }, (_, i) => ({
            id: i + 1,
            question: `What is a core concept of ${topic}?`,
            options: ['Option A', 'Option B', 'Option C', 'Option D'],
            correctIndex: 0,
            explanation: `Review ${topic} materials.`
        }));
    }
}

export async function generateGrandTestQuestions(skill, topics, count = 50) {
    const topicNames = Array.isArray(topics) ? topics.map(t => typeof t === 'string' ? t : t.title).join(', ') : 'Mixed Topics';
    try {
        const qs = await generateTestQuestions(topicNames, skill, count, 'Mixed');
        if (!qs || qs.length === 0) throw new Error('Empty responses');
        return qs;
    } catch (err) {
        console.error('Grand test AI failed:', err);
        return Array.from({ length: count }, (_, i) => ({
            id: i + 1,
            question: `Grand Test Question ${i + 1} for ${skill}`,
            options: ['Option A', 'Option B', 'Option C', 'Option D'],
            correctIndex: 0,
            explanation: 'Fallback explanation for grand test.'
        }));
    }
}