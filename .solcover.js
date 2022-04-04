module.exports = {
    skipFiles: [
        'test/TestExecutor.sol',
        'test/Imports.sol',
        'vendor'
    ],
    mocha: {
        grep: "@skip-on-coverage", // Find everything with this tag
        invert: true               // Run the grep's inverse set.
    }
};