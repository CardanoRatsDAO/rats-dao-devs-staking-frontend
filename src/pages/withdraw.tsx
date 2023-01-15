import type { InferGetStaticPropsType, InferGetServerSidePropsType, NextPage } from 'next'
import Layout from '../components/Layout'
import dynamic from 'next/dynamic'
import { toJson } from '../utils/utils'
import { connect } from '../utils/dbConnect'
import { useStoreState } from '../utils/walletProvider';
import { StakingPoolDBInterface, getStakingPools } from '../types/stakePoolDBModel'
import { createContext, useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import { stakingPoolDBParser } from '../stakePool/helpersStakePool'
import { getSession, useSession } from 'next-auth/react'
import StakingPool from '../components/StakingPool'
//--------------------------------------

const Withdraw : NextPage<InferGetServerSidePropsType<typeof getServerSideProps>> =  ({pkh, swCreate, stakingPools} : InferGetServerSidePropsType<typeof getServerSideProps>) =>  {
	
	const router = useRouter();

	const [isRefreshing, setIsRefreshing] = useState(true);

	const walletStore = useStoreState(state => state.wallet)

	const [stakingPoolsParsed, setStakingPoolsParsed] = useState<StakingPoolDBInterface [] > ([]);

	const refreshData = () => {
		console.log ("Withdraw - refreshData - router.replace - walletStore.connected " + walletStore.connected + " - router.asPath: " + router.asPath);
		router.replace(router.basePath)
		setIsRefreshing(true);
	};

	useEffect(() => {
		setIsRefreshing(false);
	}, []);

	useEffect(() => {
		if (walletStore.connected && pkh != walletStore.pkh) {
			refreshData()
		}else if (!walletStore.connected) {
			refreshData()
		}
	}, [walletStore.connected])

	useEffect(() => {
		if (stakingPools){
			for (let i = 0; i < stakingPools.length; i++) {
				stakingPools[i] = stakingPoolDBParser(stakingPools[i]);
			}
			setStakingPoolsParsed (stakingPools)
		}
		setIsRefreshing(false);
	}, [stakingPools]);
	
	return (
		<Layout swCreate={swCreate}>
			{ (!walletStore.connected) ?
					<div>Connect you wallet to see your Deposits</div>
				:
					(isRefreshing) ?
						<div>Loading Staking Pools...</div>
					:
						stakingPoolsParsed.length > 0 ? 
							stakingPoolsParsed.map(
								sp => 
								(typeof window !== 'undefined' && <StakingPool key={sp.name} stakingPoolInfo={sp}  />)
							)
						:
							<p>Can't find any Staking Pool that you have deposited into.</p> 
			}
		</Layout>
	)
}

export async function getServerSideProps(context : any) { 
	try {
		console.log ("Withdraw getServerSideProps -------------------------------");
		//console.log ("Withdraw getServerSideProps - init - context.query?.pkh:", context.query?.pkh);
		await connect();
		const session = await getSession(context)
		var rawDataStakingPools : StakingPoolDBInterface []
		if (session) {
			console.log ("Withdraw getServerSideProps - init - session:", toJson (session));
			if (session.user.pkh !== undefined) {
				rawDataStakingPools  = await getStakingPools(true, session.user.pkh)
			}else{
				rawDataStakingPools = []
			}
		}else{
			rawDataStakingPools = []
		}

		console.log ("Withdraw getServerSideProps - stakingPool - length: " + rawDataStakingPools.length)
		const stringifiedDataStakingPools = toJson(rawDataStakingPools);
		const dataStakingPools : StakingPoolDBInterface [] = JSON.parse(stringifiedDataStakingPools);
		return {
			props: {
				pkh: session?.user.pkh !== undefined ? session?.user.pkh : "",
				swCreate: session && session.user ? session.user.swCreate : false ,
				stakingPools: dataStakingPools
			}
		};

	} catch (error) {
		console.error (error)
		const dataStakingPools : StakingPoolDBInterface [] = [];
		return {
			props: { 
				pkh: "",
				swCreate: false,
				stakingPools: dataStakingPools, 
			}
		};
	}
}

export default Withdraw
