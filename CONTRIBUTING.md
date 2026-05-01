# Contributing to DevSwitch

First off, thank you for considering contributing to DevSwitch! 🎉

It's people like you that make DevSwitch such a great tool for developers managing multiple Git profiles and SSH keys.

## 💡 Ways to Contribute

There are many ways you can contribute to DevSwitch:

- **Report Bugs** - Found a bug? Let us know!
- **Suggest Features** - Have an idea for a new feature? We'd love to hear it!
- **Improve Documentation** - Help make our docs better
- **Write Code** - Fix bugs, add features, or improve existing code
- **Share Feedback** - Tell us about your experience using DevSwitch

---

## 🐛 Reporting Bugs

Before creating a bug report, please check if the issue has already been reported. If you find an existing issue, add a comment with any additional information.

### How to Submit a Good Bug Report

- **Use a clear and descriptive title**
- **Describe the exact steps to reproduce the problem**
- **Provide specific examples** - Include code samples, screenshots, or error messages
- **Describe the behavior you observed** and what you expected to see
- **Include your environment details**:
  - OS (Windows, macOS, Linux distribution)
  - DevSwitch version
  - Node.js version
  - Any relevant system configuration

---

## 💡 Suggesting Features

Feature suggestions are welcome! Before creating a feature request:

1. **Check existing discussions** - Someone might have already suggested it
2. **Be specific** - Clearly describe the feature and its use case
3. **Explain the benefits** - How will this improve DevSwitch?
4. **Consider alternatives** - Have you thought of other ways to achieve the same goal?

Open a [Discussion](https://github.com/umesh-saini/devswitch/discussions) to propose your feature idea.

---

## 🔧 Development Setup

### Prerequisites

Before you begin, make sure you have:

- **Node.js** v18 or higher
- **npm** or **yarn** package manager
- **Git** installed and configured
- A code editor (VS Code recommended)

### Setting Up Your Development Environment

1. **Fork the repository**
   
   Click the "Fork" button at the top right of the repository page.

2. **Clone your fork**
   ```bash
   git clone https://github.com/YOUR_USERNAME/devswitch.git
   cd devswitch
   ```

3. **Add upstream remote**
   ```bash
   git remote add upstream https://github.com/umesh-saini/devswitch.git
   ```

4. **Install dependencies**
   ```bash
   npm install
   ```

5. **Run the development environment**
   ```bash
   # Terminal 1: Start Vite dev server
   npm run dev

   # Terminal 2: Start Electron
   npm run electron:dev
   ```

---

## 🚀 Making Changes

### Workflow

1. **Create a new branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```
   
   Branch naming conventions:
   - `feature/` - New features (e.g., `feature/profile-templates`)
   - `bugfix/` - Bug fixes (e.g., `bugfix/ssh-config-error`)
   - `docs/` - Documentation changes (e.g., `docs/update-readme`)
   - `refactor/` - Code refactoring (e.g., `refactor/storage-service`)

2. **Make your changes**
   - Write clean, readable code
   - Follow the existing code style
   - Add comments for complex logic
   - Keep commits focused and atomic

3. **Test your changes**
   - Test the application thoroughly
   - Ensure existing features still work
   - Test on multiple platforms if possible

4. **Commit your changes**
   ```bash
   git add .
   git commit -m "Add feature: profile templates"
   ```
   
   **Commit Message Guidelines:**
   - Use present tense ("Add feature" not "Added feature")
   - Use imperative mood ("Move cursor to..." not "Moves cursor to...")
   - Keep the first line under 50 characters
   - Reference issues and PRs when relevant (e.g., "Fix #123")

5. **Keep your fork up to date**
   ```bash
   git fetch upstream
   git rebase upstream/main
   ```

6. **Push to your fork**
   ```bash
   git push origin feature/your-feature-name
   ```

7. **Open a Pull Request**
   - Go to your fork on GitHub
   - Click "Compare & pull request"
   - Fill in the PR template with details about your changes
   - Link any related issues

---

## 📝 Code Style Guidelines

### TypeScript

- Use **TypeScript** for all new code
- Define proper types and interfaces
- Avoid using `any` type
- Use descriptive variable and function names

### React Components

- Use **functional components** with hooks
- Keep components small and focused
- Extract reusable logic into custom hooks
- Use proper prop types and interfaces

### File Organization & Best Practices

- **Keep files small**: Do not make files too large by writing extra unnecessary code. Keep code split into smaller, focused files.
- **No magic strings**: Always use `const` or `enum` for strings that are reused across the codebase. Avoid hardcoding magic strings directly.
- **Code reusability**: If code looks like it can be reused, move it to the `utils/` or `services/` directory as appropriate. Before making a new function, check if a similar one already exists.
- Group related files together and use meaningful file and folder names.
- Keep the project structure consistent.

### CSS/Styling

- Use **Tailwind CSS** utility classes
- Follow the existing design system
- Use CSS variables for theme values
- Ensure dark mode compatibility

### Comments & Documentation

- **Document generics**: For generic functions or classes that can be used in different ways, ensure you provide proper and thorough documentation detailing how to use them.
- Write comments for complex logic
- Document function parameters and return values
- Keep comments up to date with code changes

---

## 🧪 Testing

While we don't have automated tests yet, please:

- Manually test all changes thoroughly
- Test on multiple platforms when possible (Windows, macOS, Linux)
- Verify that existing features still work
- Test both light and dark themes
- Check window controls (minimize, maximize, close)

---

## 📚 Documentation

If your changes require documentation updates:

- Update the README.md if needed
- Add JSDoc comments for functions and components
- Update any affected documentation
- Include screenshots for UI changes

---

## ✅ Pull Request Checklist

Before submitting your pull request, make sure:

- [ ] Code follows the project's style guidelines
- [ ] Changes have been tested locally
- [ ] Commit messages are clear and descriptive
- [ ] Documentation has been updated (if needed)
- [ ] No console errors or warnings
- [ ] Dark mode works correctly (if UI changes)
- [ ] All window controls work properly (if UI changes)

---

## 🤝 Code Review Process

After you submit a pull request:

1. **Automated checks** - Wait for any automated checks to pass
2. **Review** - A maintainer will review your code
3. **Feedback** - Address any requested changes
4. **Approval** - Once approved, your PR will be merged
5. **Celebration** - You're now a DevSwitch contributor! 🎉

---

## 💬 Getting Help

Need help or have questions?

- **Discussions** - Ask questions in [GitHub Discussions](https://github.com/umesh-saini/devswitch/discussions)
- **Issues** - Report bugs in [GitHub Issues](https://github.com/umesh-saini/devswitch/issues)
- **Documentation** - Check the [README](README.md) for usage instructions

---

## 📜 Code of Conduct

Please refer to our full [Code of Conduct](CODE_OF_CONDUCT.md) for detailed information about our community standards and expectations.

### Core Principles

- **Be respectful** - Treat everyone with respect and kindness
- **Be collaborative** - Work together to improve DevSwitch
- **Be constructive** - Provide helpful feedback
- **Be patient** - Remember that everyone is learning

---

## 🎓 First-Time Contributors

New to open source? No problem! Here are some beginner-friendly ways to contribute:

- Fix typos in documentation
- Improve error messages
- Add code comments
- Update screenshots
- Report bugs
- Suggest UI improvements

Look for issues labeled `good first issue` or `beginner-friendly`.

---

## 📄 License

By contributing to DevSwitch, you agree that your contributions will be licensed under the [MIT License](LICENSE).

---

## 🙏 Thank You!

Your contributions help make DevSwitch better for everyone. We appreciate your time and effort! ❤️

---

**Questions?** Feel free to reach out by opening a [Discussion](https://github.com/umesh-saini/devswitch/discussions).
