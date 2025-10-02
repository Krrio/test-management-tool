import Image from 'next/image'
import Link from 'next/link'
import React from 'react'

const Footer = () => {
  return (
    <div className='h-[50px] relative mx-auto flex max-w-[calc(100%-2rem)] mb-4 font-devis'>
        <div className='w-full flex items-center justify-between'>
            <div className='flex flex-row items-center justify-center space-x-4 text-md text-[#e3e3e3]/80'>
                <Link href='/support'>
                    Support 
                </Link>
                <Link href='/support'>
                    Register 
                </Link>
            </div>
            <div className='flex flex-row items-center justify-center space-x-4 text-md text-[#e3e3e3]/40'>
                <p>
                    © Made with love at TMT by Josephic 20205.
                </p>
            </div>
            <div className='flex flex-row items-center justify-center space-x-4 text-md text-[#e3e3e3]/40'>
                <Link href='/support' className='w-[40px] h-[40px] bg-black border rounded-md items-center justify-center flex'>
                     <Image src='/assets/images/x.png' alt='social' height={30} width={30}/>
                </Link>
                <Link href='/support' className='w-[40px] h-[40px] bg-black border rounded-md items-center justify-center flex'>
                     <Image src='/assets/images/linkedin.png' alt='social' height={30} width={30} className='invert'/>
                </Link>
            </div>
        </div>
    </div>
  )
}

export default Footer