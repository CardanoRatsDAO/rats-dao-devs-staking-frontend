// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from 'next'

import { connect } from '../../utils/dbConnect'

import { strToHex, toJson } from '../../utils/utils';

import { getStakingPoolDBModel, getStakingPoolFromDBByName, StakingPoolDBInterface } from  '../../types/stakePoolDBModel'
import { getSession } from 'next-auth/react';

type Data = {
	msg: string
}

export default async function handler( req: NextApiRequest, res: NextApiResponse<Data | string>) {

    //--------------------------------
    const session = await getSession({ req })
    if (!session) {
        console.error("/api/deleteStakingPool - Must Connect to your Wallet"); 
        res.status(400).json({ msg: "Must Connect to your Wallet" })
    }
    const sesionPkh = session?.user.pkh
    //--------------------------------

	const nombrePool = req.body.nombrePool

	await connect();

	console.log("/api/deleteStakingPool - Request: " + toJson(req.body.nombrePool));
	
    try{
        const stakingPoolWithSameName = await getStakingPoolFromDBByName (nombrePool)
        
        if (stakingPoolWithSameName.length === 0 ){
            console.error("/api/deleteStakingPool - Can't delete StakingPool in Database - Error: Can't find StakingPool: " + nombrePool); 
            res.status(400).json({ msg: "Can't delete StakingPool in Database - Error: Can't find StakingPool: " + nombrePool})
            return 
        } else if (stakingPoolWithSameName.length > 1 ){
            console.error("/api/deleteStakingPool - Can't delete StakingPool in Database - Error: StakingPool twice: " + nombrePool); 
            res.status(400).json({ msg: "Can't delete StakingPool in Database - Error: StakingPool twice " + nombrePool})
            return 
        } else {
            const stakingPool = stakingPoolWithSameName[0]
            if (!stakingPool.masters.includes(sesionPkh!)){
                console.error("/api/deleteStakingPool - You aren't master of this Staking Pool"); 
                res.status(400).json({ msg: "You aren't master of this Staking Pool"})
                return 
            }

            if (!stakingPool.swPoolReadyForDelete ){
                console.error("/api/deleteStakingPool - Staking Pool is not ready for delete");
                res.status(400).json({ msg: "Staking Pool is not ready for delete"})
                return 
            }

            var StakingPoolDBModel = getStakingPoolDBModel()

            const filter = {name : nombrePool};
            
            await StakingPoolDBModel.deleteOne(filter)

            console.log("/api/deleteStakingPool - StakingPool deleted in Database!");
            res.status(200).json({ msg: "StakingPool Deleted!"})
            return

        }
    } catch (error) {
        console.error("/api/deleteStakingPool - Can't delete StakingPool in Database - Error: " + error);
        res.status(400).json({ msg: "Can't delete StakingPool in Database - Error: " + error });
        return;
    }
}
