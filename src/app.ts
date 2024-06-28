import express, { Request, Response } from 'express';
import dotenv from 'dotenv';
import bodyParser from "body-parser";
import morgan from "morgan";
import cors from "cors";
import { getConfig, printConfig, setConfigOnStart } from './lib/config';
import { WebSocketServer } from 'ws'
import { daoRoutes } from './routes/dao/daoRoutes'
import { getExchangeRates, rateRoutes, updateExchangeRate, updateExchangeRates } from './routes/rates/rateRoutes'
import { pox3Routes } from './routes/pox3/poxRoutes'
import { pox4Routes } from './routes/pox4/pox/pox4Routes'
import { connect, getDaoMongoConfig, saveOrUpdateDaoMongoConfig } from './lib/data/db_models';
import { pox4EventsJob } from './routes/schedules/JobScheduler';
import { getDaoConfig, setDaoConfigOnStart } from './lib/config_dao';

if (process.env.NODE_ENV === 'development') {
  dotenv.config();
}

const app = express();
const port = process.env.PORT || 3010;
app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '10mb' }));
app.use(express.json());

app.use(morgan("tiny"));
app.use(express.static("public"));
app.use(cors()); 
setConfigOnStart();
setDaoConfigOnStart()
printConfig()

app.use(
  bodyParser.urlencoded({
    extended: true, 
  })
);
app.use(bodyParser.json());
app.use((req, res, next) => {
  if (req.method === 'POST' || req.method === 'PUT' || req.method === 'DELETE') {
    next()
  } else {
    next()
  }
})

app.use('/bridge-api/dao/v1', daoRoutes);
app.use('/bridge-api/rates/v1', rateRoutes);
app.use('/bridge-api/pox3/v1', pox3Routes);
app.use('/bridge-api/pox4/v1', pox4Routes);

console.log(`\n\nExpress is listening at http://localhost:${getConfig().port}`);
console.log('Startup Environment: ', process.env.NODE_ENV);
console.log('stacks stacksApi = ' + getConfig().stacksApi)
console.log('bitcoin mempoolApi = ' + getConfig().mempoolUrl)
console.log('using local db = ' + getConfig().mongoDbName)

async function connectToMongoCloud() {

  await connect();
  const rates = await getExchangeRates()
  if (!rates || rates.length === 0) {
    await updateExchangeRates()
    console.log("Read exchange rates!");
  }
  const dc = await getDaoMongoConfig()
  if (!dc) {
    await saveOrUpdateDaoMongoConfig({
      configId: 1,
      contractId: getDaoConfig().VITE_DOA_PROPOSAL
    })
    console.log("Read initial proposal!");
  }

  console.log("Connected to MongoDB!");
  const server = app.listen(getConfig().port, () => {
    console.log("Server listening!");
    return;
  });

  const wss = new WebSocketServer({ server })
  pox4EventsJob.start();

  wss.on('connection', function connection(ws:any) {
    ws.on('message', function incoming(message:any) { 
      ws.send('Got your new rates : ' + message)
    })
  })
}

connectToMongoCloud();
