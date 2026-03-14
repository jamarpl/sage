import { Router } from 'express';
import * as areaController from '../controllers/area.controller';

const router = Router();

router.get('/current', areaController.getCurrentArea);

export default router;
