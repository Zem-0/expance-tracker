const app = require('./app');
const { port } = require('./config');

app.listen(port, () => console.log(`Backend running on http://localhost:${port}`));
