export default {
    server: {
        host: '0.0.0.0',
        allowedHosts: ['cftv.solidsites.dev', '.solidsites.dev', 'localhost'],
        strictPort: true,
        hmr: {
            host: 'cftv.solidsites.dev',
            protocol: 'wss'
        }
    }
}
